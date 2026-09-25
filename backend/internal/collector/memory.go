package collector

import (
	"context"
	"fmt"
	"math"

	"github.com/goravg/goseeit/internal/model"
	"github.com/shirou/gopsutil/v4/mem"
)

// MemoryCollector gathers RAM and Swap utilization metrics.
type MemoryCollector struct{}

// NewMemoryCollector constructs a new MemoryCollector.
func NewMemoryCollector() *MemoryCollector {
	return &MemoryCollector{}
}

// Name returns the collector name.
func (m *MemoryCollector) Name() string {
	return "memory"
}

// Collect returns RAM and Swap statistics.
func (m *MemoryCollector) Collect(ctx context.Context) (*model.MemoryStats, error) {
	v, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get virtual memory: %w", err)
	}

	stats := &model.MemoryStats{
		TotalBytes:     v.Total,
		UsedBytes:      v.Used,
		FreeBytes:      v.Free,
		AvailableBytes: v.Available,
		UsedPercent:    math.Round(v.UsedPercent*10) / 10,
	}

	if s, err := mem.SwapMemoryWithContext(ctx); err == nil && s != nil {
		stats.SwapTotalBytes = s.Total
		stats.SwapUsedBytes = s.Used
		stats.SwapFreeBytes = s.Free
		stats.SwapUsedPercent = math.Round(s.UsedPercent*10) / 10
	}

	return stats, nil
}
