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
