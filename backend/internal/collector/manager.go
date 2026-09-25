package collector

import (
	"context"
	"log"
	"runtime/debug"
	"sync"
	"time"

	"github.com/goravg/goseeit/internal/config"
	"github.com/goravg/goseeit/internal/model"
)

// Manager coordinates concurrent metrics collection across all subsystems.
type Manager struct {
	hostCollector    *HostCollector
	cpuCollector     *CPUCollector
	memoryCollector  *MemoryCollector
	diskCollector    *DiskCollector
	networkCollector *NetworkCollector
	gpuCollector     *GPUCollector
	dockerCollector  *DockerCollector
}

// NewManager creates and initializes all collectors based on provided config.
func NewManager(cfg *config.Config) *Manager {
	return &Manager{
		hostCollector:    NewHostCollector(),
		cpuCollector:     NewCPUCollector(),
		memoryCollector:  NewMemoryCollector(),
		diskCollector:    NewDiskCollector(cfg.Monitor.Disks),
		networkCollector: NewNetworkCollector(cfg.Monitor.Interfaces),
		gpuCollector:     NewGPUCollector(cfg.Monitor.IntelGPU.SysfsPath, cfg.Monitor.IntelGPU.Enabled),
		dockerCollector:  NewDockerCollector(cfg.Monitor.Docker.SocketPath, cfg.Monitor.Docker.Enabled),
	}
}

// CollectAll fans out collection tasks across goroutines and fans in results into a SystemSnapshot.
func (m *Manager) CollectAll(ctx context.Context) *model.SystemSnapshot {
	snapshot := &model.SystemSnapshot{
		Timestamp: time.Now(),
	}

	var wg sync.WaitGroup
	var mu sync.Mutex

	// Helper to launch collector with recovery and stack trace logging
	runCollector := func(name string, fn func()) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[Collector:%s] panic recovered: %v\n%s", name, r, debug.Stack())
				}
			}()
			fn()
		}()
	}

	// Fan-out: Collect all metrics concurrently with concrete types
	runCollector("host", func() {
		h, err := m.hostCollector.Collect(ctx)
		if err == nil && h != nil {
			mu.Lock()
			snapshot.Host = h
			mu.Unlock()
		}
	})

	runCollector("cpu", func() {
		c, err := m.cpuCollector.Collect(ctx)
		if err == nil && c != nil {
			mu.Lock()
			snapshot.CPU = c
			mu.Unlock()
		}
	})

	runCollector("memory", func() {
		mem, err := m.memoryCollector.Collect(ctx)
		if err == nil && mem != nil {
			mu.Lock()
			snapshot.Memory = mem
			mu.Unlock()
		}
	})

	runCollector("disk", func() {
		disks, err := m.diskCollector.Collect(ctx)
		if err == nil && disks != nil {
			mu.Lock()
			snapshot.Disks = disks
			mu.Unlock()
		}
	})

	runCollector("network", func() {
		networks, err := m.networkCollector.Collect(ctx)
		if err == nil && networks != nil {
			mu.Lock()
			snapshot.Networks = networks
			mu.Unlock()
		}
	})

	runCollector("gpu", func() {
		gpu, err := m.gpuCollector.Collect(ctx)
		if err == nil && gpu != nil {
			mu.Lock()
			snapshot.GPU = gpu
			mu.Unlock()
		}
	})

	runCollector("docker", func() {
		res, err := m.dockerCollector.Collect(ctx)
		if err == nil {
			mu.Lock()
			snapshot.Containers = res.Containers
			snapshot.DockerError = res.Error
			mu.Unlock()
		}
	})

	// Fan-in: Wait for all collector goroutines to complete
	wg.Wait()

	return snapshot
}
