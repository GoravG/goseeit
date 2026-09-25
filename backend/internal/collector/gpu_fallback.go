//go:build !linux

package collector

import (
	"context"

	"github.com/goravg/goseeit/internal/model"
)

// GPUCollector stub for non-Linux systems.
type GPUCollector struct {
	enabled bool
}

// NewGPUCollector constructs a GPUCollector stub.
func NewGPUCollector(sysfsPath string, enabled bool) *GPUCollector {
	return &GPUCollector{
		enabled: enabled,
	}
}

// Name returns the collector name.
func (g *GPUCollector) Name() string {
	return "gpu"
}

// Collect returns a mock/unsupported GPU metric on non-Linux platforms.
func (g *GPUCollector) Collect(ctx context.Context) (*model.GPUStats, error) {
	if !g.enabled {
		return &model.GPUStats{Available: false}, nil
	}

	return &model.GPUStats{
		Available:    false,
		Vendor:       "Non-Linux Host",
		DeviceName:   "Intel GPU metrics require Linux sysfs drm",
		UsagePercent: 0,
	}, nil
}
