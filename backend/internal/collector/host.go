package collector

import (
	"context"
	"fmt"
	"time"

	"github.com/goravg/goseeit/internal/model"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/load"
)

// HostCollector gathers static and dynamic host info.
type HostCollector struct{}

// NewHostCollector constructs a new HostCollector.
func NewHostCollector() *HostCollector {
	return &HostCollector{}
}

// Name returns the collector name.
func (h *HostCollector) Name() string {
	return "host"
}

// Collect reads uptime, OS, platform, and load averages.
func (h *HostCollector) Collect(ctx context.Context) (*model.HostInfo, error) {
	info, err := host.InfoWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get host info: %w", err)
	}

	res := &model.HostInfo{
		Hostname:       info.Hostname,
		OS:             info.OS,
		Platform:       info.Platform,
		PlatformFamily: info.PlatformFamily,
		KernelVersion:  info.KernelVersion,
		UptimeSeconds:  info.Uptime,
		BootTime:       time.Unix(int64(info.BootTime), 0),
	}

	if l, err := load.AvgWithContext(ctx); err == nil && l != nil {
		res.LoadAvg1 = l.Load1
		res.LoadAvg5 = l.Load5
		res.LoadAvg15 = l.Load15
	}

	return res, nil
}
