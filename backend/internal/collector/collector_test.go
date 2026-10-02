package collector

import (
	"context"
	"testing"
	"time"

	"github.com/goravg/goseeit/internal/config"
)

func TestHostCollector(t *testing.T) {
	c := NewHostCollector()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	hostInfo, err := c.Collect(ctx)
	if err != nil {
		t.Fatalf("host collect failed: %v", err)
	}
	if hostInfo == nil {
		t.Fatal("expected non-nil HostInfo")
	}
	if hostInfo.OS == "" {
		t.Errorf("expected non-empty OS name")
	}
}

func TestCPUCollector(t *testing.T) {
	c := NewCPUCollector()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cpuStats, err := c.Collect(ctx)
	if err != nil {
		t.Fatalf("cpu collect failed: %v", err)
	}
	if cpuStats == nil {
		t.Fatal("expected non-nil CPUStats")
	}
	if cpuStats.CoreCount <= 0 {
		t.Errorf("expected positive core count, got %d", cpuStats.CoreCount)
	}
}

func TestMemoryCollector(t *testing.T) {
	c := NewMemoryCollector()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	memStats, err := c.Collect(ctx)
	if err != nil {
		t.Fatalf("memory collect failed: %v", err)
	}
	if memStats == nil {
		t.Fatal("expected non-nil MemoryStats")
	}
	if memStats.TotalBytes == 0 {
		t.Errorf("expected non-zero total memory")
	}
}

func TestDiskCollector(t *testing.T) {
	c := NewDiskCollector([]string{"/"})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	disks, err := c.Collect(ctx)
	if err != nil {
		t.Fatalf("disk collect failed: %v", err)
	}
	if len(disks) == 0 {
		t.Log("Note: no target disks matched in test environment")
	}
}

func TestNetworkCollector(t *testing.T) {
	c := NewNetworkCollector(nil)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	networks, err := c.Collect(ctx)
	if err != nil {
		t.Fatalf("network collect failed: %v", err)
	}
	if len(networks) == 0 {
		t.Log("Note: no interfaces matched in test environment")
	}
}

func TestGPUCollector(t *testing.T) {
	c := NewGPUCollector("", true)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	gpu, err := c.Collect(ctx)
	if err != nil {
		t.Fatalf("gpu collect failed: %v", err)
	}
	if gpu == nil {
		t.Fatal("expected non-nil GPUStats")
	}
}

func TestManagerCollectAll(t *testing.T) {
	cfg := config.DefaultConfig()
	mgr := NewManager(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	snapshot := mgr.CollectAll(ctx)
	if snapshot == nil {
		t.Fatal("expected non-nil snapshot")
	}
	if snapshot.Host == nil {
		t.Error("expected non-nil Host info in snapshot")
	}
	if snapshot.CPU == nil {
		t.Error("expected non-nil CPU stats in snapshot")
	}
	if snapshot.Memory == nil {
		t.Error("expected non-nil Memory stats in snapshot")
	}
}

func TestDockerCalculateCPUPercent(t *testing.T) {
	now := time.Now()

	// 1. First tick with no pre-stats: returns 0.0
	percent := calculateCPUPercent(1000000000, 4000000000, now, containerPrevStats{}, false, 4, 0, 0)
	if percent != 0.0 {
		t.Errorf("expected 0.0 on first sample, got %v", percent)
	}

	// 2. Second tick with valid system and container usage (1 core fully used over interval on 4-core machine)
	// Container used 1 sec (1e9 ns), Host total system advanced by 4 sec (4e9 ns) across 4 cores
	prev := containerPrevStats{
		totalUsage:  1000000000,
		systemUsage: 4000000000,
		time:        now.Add(-1 * time.Second),
	}
	// Container now at 2e9 ns, host at 8e9 ns
	percent = calculateCPUPercent(2000000000, 8000000000, now, prev, true, 4, 0, 0)
	// (1e9 / 4e9) * 4 * 100 = 100.0%
	if percent != 100.0 {
		t.Errorf("expected 100.0%%, got %v", percent)
	}

	// 3. Wall-clock fallback when systemUsage is 0 (e.g. cgroup v2 system_cpu_usage missing)
	prevZeroSys := containerPrevStats{
		totalUsage:  1000000000,
		systemUsage: 0,
		time:        now.Add(-2 * time.Second),
	}
	// Container used 1 second of CPU over 2 seconds of elapsed wall time
	percent = calculateCPUPercent(2000000000, 0, now, prevZeroSys, true, 4, 0, 0)
	// cpuDelta = 1e9, elapsedNs = 2e9, systemDelta = 2e9 * 4 = 8e9
	// (1e9 / 8e9) * 4 * 100 = 50.0%
	if percent != 50.0 {
		t.Errorf("expected 50.0%% with wall-clock fallback, got %v", percent)
	}

	// 4. Counter decrease (container restart)
	percent = calculateCPUPercent(500000, 9000000000, now, prev, true, 4, 0, 0)
	if percent != 0.0 {
		t.Errorf("expected 0.0 on counter reset, got %v", percent)
	}
}

func TestExtractContainerURL(t *testing.T) {
	tests := []struct {
		name     string
		labels   map[string]string
		expected string
	}{
		{
			name:     "empty labels",
			labels:   nil,
			expected: "",
		},
		{
			name: "goseeit.url valid URL",
			labels: map[string]string{
				"goseeit.url": "http://nuc.local:80",
			},
			expected: "http://nuc.local:80",
		},
		{
			name: "goseeit.url trims whitespace",
			labels: map[string]string{
				"goseeit.url": "  http://nuc.local:8082   ",
			},
			expected: "http://nuc.local:8082",
		},
		{
			name: "unrelated labels ignored",
			labels: map[string]string{
				"custom.url":     "http://nuc.local:80",
				"traefik.enable": "true",
			},
			expected: "",
		},
		{
			name: "empty string goseeit.url",
			labels: map[string]string{
				"goseeit.url": "   ",
			},
			expected: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractContainerURL(tc.labels)
			if got != tc.expected {
				t.Errorf("extractContainerURL() = %q, want %q", got, tc.expected)
			}
		})
	}
}

func TestExtractContainerName(t *testing.T) {
	tests := []struct {
		name     string
		names    []string
		labels   map[string]string
		expected string
	}{
		{
			name:     "default container name stripped slash",
			names:    []string{"/suchi"},
			labels:   nil,
			expected: "suchi",
		},
		{
			name:  "goseeit.name override",
			names: []string{"/docker-compose_suchi_1"},
			labels: map[string]string{
				"goseeit.name": "Suchi Media",
			},
			expected: "Suchi Media",
		},
		{
			name:  "unrelated labels do not override name",
			names: []string{"/docker-compose_suchi_1"},
			labels: map[string]string{
				"custom.name": "Custom Media Server",
			},
			expected: "docker-compose_suchi_1",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := extractContainerName(tc.names, tc.labels)
			if got != tc.expected {
				t.Errorf("extractContainerName() = %q, want %q", got, tc.expected)
			}
		})
	}
}

