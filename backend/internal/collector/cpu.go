package collector

import (
	"context"
	"fmt"
	"math"
	"sync"

	"github.com/goravg/goseeit/internal/model"
	"github.com/shirou/gopsutil/v4/cpu"
)

// CPUCollector gathers CPU utilization metrics.
type CPUCollector struct {
	mu        sync.RWMutex
	modelName string
	coreCount int
}

// NewCPUCollector constructs and caches static CPU metadata.
func NewCPUCollector() *CPUCollector {
	c := &CPUCollector{}
	if infos, err := cpu.Info(); err == nil && len(infos) > 0 {
		c.modelName = infos[0].ModelName
	}
	if counts, err := cpu.Counts(true); err == nil && counts > 0 {
		c.coreCount = counts
	}
	return c
}

// Name returns the collector name.
func (c *CPUCollector) Name() string {
	return "cpu"
}

// Collect returns total and per-core CPU percentages.
func (c *CPUCollector) Collect(ctx context.Context) (*model.CPUStats, error) {
	// Percent with interval 0 computes usage since the previous call
	percents, err := cpu.PercentWithContext(ctx, 0, true)
	if err != nil {
		return nil, fmt.Errorf("failed to get CPU percentages: %w", err)
	}

	var total float64
	perCore := make([]float64, len(percents))
	for i, p := range percents {
		if math.IsNaN(p) || p < 0 {
			p = 0
		}
		perCore[i] = math.Round(p*10) / 10
		total += p
	}

	var avgTotal float64
	if len(percents) > 0 {
		avgTotal = math.Round((total/float64(len(percents)))*10) / 10
	}

	c.mu.RLock()
	coreCount := c.coreCount
	if coreCount == 0 {
		coreCount = len(percents)
	}
	modelName := c.modelName
	c.mu.RUnlock()

	return &model.CPUStats{
		TotalPercent:   avgTotal,
		PerCorePercent: perCore,
		CoreCount:      coreCount,
		ModelName:      modelName,
	}, nil
}
