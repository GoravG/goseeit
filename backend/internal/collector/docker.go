package collector

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/goravg/goseeit/internal/model"
)

// DockerCollector gathers container statuses and resource metrics.
type DockerCollector struct {
	enabled    bool
	socketPath string
	client     *client.Client
	mu         sync.Mutex
}

type dockerStatsPayload struct {
	CPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
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
		name := ""
		if len(c.Names) > 0 {
			name = strings.TrimPrefix(c.Names[0], "/")
		}

		results[i] = model.ContainerMetric{
			ID:     c.ID[:min(12, len(c.ID))],
			Name:   name,
			Image:  c.Image,
			State:  c.State,
			Status: c.Status,
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

				// Calculate CPU %
				cpuDelta := float64(payload.CPUStats.CPUUsage.TotalUsage) - float64(payload.PreCPUStats.CPUUsage.TotalUsage)
				systemDelta := float64(payload.CPUStats.SystemCPUUsage) - float64(payload.PreCPUStats.SystemCPUUsage)
				onlineCPUs := float64(payload.CPUStats.OnlineCPUs)
				if onlineCPUs == 0 {
					onlineCPUs = 1
				}

				var cpuPercent float64
				if systemDelta > 0 && cpuDelta > 0 {
					cpuPercent = math.Round(((cpuDelta/systemDelta)*onlineCPUs*100.0)*10) / 10
				}

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
	return DockerResult{Containers: results}, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
