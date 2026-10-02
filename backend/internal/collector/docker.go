package collector

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/goravg/goseeit/internal/model"
)

type containerPrevStats struct {
	totalUsage  uint64
	systemUsage uint64
	time        time.Time
}

// DockerCollector gathers container statuses and resource metrics.
type DockerCollector struct {
	enabled     bool
	socketPath  string
	client      *client.Client
	mu          sync.Mutex
	prevStats   map[string]containerPrevStats
	prevStatsMu sync.Mutex
}

type dockerStatsPayload struct {
	CPUStats struct {
		CPUUsage struct {
			TotalUsage  uint64   `json:"total_usage"`
			PercpuUsage []uint64 `json:"percpu_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs     uint32 `json:"online_cpus"`
	} `json:"cpu_stats"`
	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`
		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`
	MemoryStats struct {
		Usage uint64            `json:"usage"`
		Limit uint64            `json:"limit"`
		Stats map[string]uint64 `json:"stats"`
	} `json:"memory_stats"`
	Networks map[string]struct {
		RxBytes uint64 `json:"rx_bytes"`
		TxBytes uint64 `json:"tx_bytes"`
	} `json:"networks"`
}

// NewDockerCollector initializes the collector with Docker daemon socket options.
func NewDockerCollector(socketPath string, enabled bool) *DockerCollector {
	if socketPath == "" {
		socketPath = "unix:///var/run/docker.sock"
	}
	d := &DockerCollector{
		enabled:    enabled,
		socketPath: socketPath,
		prevStats:  make(map[string]containerPrevStats),
	}
	d.initClient()
	return d
}

func (d *DockerCollector) initClient() {
	if !d.enabled {
		return
	}
	cli, err := client.NewClientWithOpts(
		client.WithHost(d.socketPath),
		client.WithAPIVersionNegotiation(),
		client.WithTimeout(2*time.Second),
	)
	if err == nil {
		d.client = cli
	}
}

// Name returns the collector name.
func (d *DockerCollector) Name() string {
	return "docker"
}

// DockerResult wraps container metrics and connection errors.
type DockerResult struct {
	Containers []model.ContainerMetric
	Error      string
}

// calculateCPUPercent calculates real-time CPU percentage between measurements.
func calculateCPUPercent(
	currentTotal uint64,
	currentSystem uint64,
	now time.Time,
	prev containerPrevStats,
	hasPrev bool,
	onlineCPUs float64,
	dockerPreCPU uint64,
	dockerPreSystem uint64,
) float64 {
	var cpuDelta float64
	var systemDelta float64

	if hasPrev {
		cpuDelta = float64(currentTotal) - float64(prev.totalUsage)
		if currentSystem > 0 && prev.systemUsage > 0 && currentSystem > prev.systemUsage {
			systemDelta = float64(currentSystem) - float64(prev.systemUsage)
		} else {
			elapsedNs := float64(now.Sub(prev.time).Nanoseconds())
			if elapsedNs > 0 {
				systemDelta = elapsedNs * onlineCPUs
			}
		}
	} else if dockerPreCPU > 0 && dockerPreSystem > 0 && currentSystem > dockerPreSystem {
		cpuDelta = float64(currentTotal) - float64(dockerPreCPU)
		systemDelta = float64(currentSystem) - float64(dockerPreSystem)
	}

	if systemDelta > 0 && cpuDelta > 0 {
		return math.Round(((cpuDelta/systemDelta)*onlineCPUs*100.0)*10) / 10
	}
	return 0.0
}

// extractContainerURL retrieves the configured web UI URL from the container's goseeit.url label.
func extractContainerURL(labels map[string]string) string {
	if len(labels) == 0 {
		return ""
	}
	if val, ok := labels["goseeit.url"]; ok {
		return strings.TrimSpace(val)
	}
	return ""
}

// extractContainerName retrieves the friendly container display name, supporting the goseeit.name
// label override before falling back to Docker container names.
func extractContainerName(names []string, labels map[string]string) string {
	if len(labels) > 0 {
		if val, ok := labels["goseeit.name"]; ok {
			val = strings.TrimSpace(val)
			if val != "" {
				return val
			}
		}
	}
	if len(names) > 0 {
		return strings.TrimPrefix(names[0], "/")
	}
	return ""
}

// Collect inspects active Docker containers.
func (d *DockerCollector) Collect(ctx context.Context) (DockerResult, error) {
	if !d.enabled {
		return DockerResult{}, nil
	}

	d.mu.Lock()
	if d.client == nil {
		d.initClient()
	}
	cli := d.client
	d.mu.Unlock()

	if cli == nil {
		return DockerResult{Error: "Docker client not initialized"}, nil
	}

	containers, err := cli.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return DockerResult{Error: fmt.Sprintf("Failed to connect to Docker daemon: %v", err)}, nil
	}

	results := make([]model.ContainerMetric, len(containers))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 5) // Concurrently fetch at most 5 containers at a time

	for i, c := range containers {
		name := extractContainerName(c.Names, c.Labels)
		url := extractContainerURL(c.Labels)

		results[i] = model.ContainerMetric{
			ID:     c.ID[:min(12, len(c.ID))],
			Name:   name,
			Image:  c.Image,
			State:  c.State,
			Status: c.Status,
			URL:    url,
		}

		// Only gather resource stats for running containers
		if c.State == "running" {
			wg.Add(1)
			go func(idx int, cID string) {
				defer wg.Done()

				// 1.5 second per-container timeout
				statCtx, cancel := context.WithTimeout(ctx, 1500*time.Millisecond)
				defer cancel()

				select {
				case sem <- struct{}{}:
				case <-statCtx.Done():
					return
				}
				defer func() { <-sem }()

				resp, err := cli.ContainerStatsOneShot(statCtx, cID)
				if err != nil {
					return
				}
				defer resp.Body.Close()

				var payload dockerStatsPayload
				if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
					return
				}

				now := time.Now()
				currentTotal := payload.CPUStats.CPUUsage.TotalUsage
				currentSystem := payload.CPUStats.SystemCPUUsage

				onlineCPUs := float64(payload.CPUStats.OnlineCPUs)
				if onlineCPUs == 0 {
					onlineCPUs = float64(len(payload.CPUStats.CPUUsage.PercpuUsage))
				}
				if onlineCPUs == 0 {
					onlineCPUs = float64(runtime.NumCPU())
				}

				d.prevStatsMu.Lock()
				prev, hasPrev := d.prevStats[cID]
				d.prevStats[cID] = containerPrevStats{
					totalUsage:  currentTotal,
					systemUsage: currentSystem,
					time:        now,
				}
				d.prevStatsMu.Unlock()

				cpuPercent := calculateCPUPercent(
					currentTotal,
					currentSystem,
					now,
					prev,
					hasPrev,
					onlineCPUs,
					payload.PreCPUStats.CPUUsage.TotalUsage,
					payload.PreCPUStats.SystemCPUUsage,
				)

				// Calculate Memory usage (subtract inactive_file cache if present)
				memUsage := payload.MemoryStats.Usage
				if cache, ok := payload.MemoryStats.Stats["inactive_file"]; ok && memUsage > cache {
					memUsage -= cache
				}
				memLimit := payload.MemoryStats.Limit
				var memPercent float64
				if memLimit > 0 {
					memPercent = math.Round((float64(memUsage)/float64(memLimit)*100.0)*10) / 10
				}

				// Calculate Network bytes
				var rx, tx uint64
				for _, net := range payload.Networks {
					rx += net.RxBytes
					tx += net.TxBytes
				}

				results[idx].CPUPercent = cpuPercent
				results[idx].MemoryUsedBytes = memUsage
				results[idx].MemoryLimitBytes = memLimit
				results[idx].MemoryPercent = memPercent
				results[idx].NetRxBytes = rx
				results[idx].NetTxBytes = tx
			}(i, c.ID)
		}
	}

	wg.Wait()

	// Prune stopped or removed containers from prevStats cache
	activeIDs := make(map[string]struct{}, len(containers))
	for _, c := range containers {
		if c.State == "running" {
			activeIDs[c.ID] = struct{}{}
		}
	}
	d.prevStatsMu.Lock()
	for id := range d.prevStats {
		if _, active := activeIDs[id]; !active {
			delete(d.prevStats, id)
		}
	}
	d.prevStatsMu.Unlock()

	return DockerResult{Containers: results}, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

