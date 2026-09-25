//go:build linux

package collector

import (
	"context"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/goravg/goseeit/internal/model"
)

// GPUCollector gathers Intel GPU stats from Linux sysfs.
type GPUCollector struct {
	sysfsPath string
	enabled   bool
}

// NewGPUCollector constructs a GPUCollector for Linux.
func NewGPUCollector(sysfsPath string, enabled bool) *GPUCollector {
	if sysfsPath == "" {
		if hostSys := os.Getenv("HOST_SYS"); hostSys != "" {
			sysfsPath = filepath.Join(hostSys, "class/drm/card0")
		} else {
			sysfsPath = "/sys/class/drm/card0"
		}
	}
	return &GPUCollector{
		sysfsPath: sysfsPath,
		enabled:   enabled,
	}
}

// Name returns the collector name.
func (g *GPUCollector) Name() string {
	return "gpu"
}

// Collect reads Intel GPU sysfs statistics.
func (g *GPUCollector) Collect(ctx context.Context) (*model.GPUStats, error) {
	if !g.enabled {
		return &model.GPUStats{Available: false}, nil
	}

	// Verify DRM card path exists
	if _, err := os.Stat(g.sysfsPath); os.IsNotExist(err) {
		return &model.GPUStats{Available: false}, nil
	}

	stats := &model.GPUStats{
		Available:  true,
		Vendor:     "Intel",
		DeviceName: "Intel Integrated Graphics",
	}

	// Read Vendor ID to verify
	vendorBytes, err := os.ReadFile(filepath.Join(g.sysfsPath, "device", "vendor"))
	if err == nil {
		vendorID := strings.TrimSpace(string(vendorBytes))
		if vendorID == "0x8086" {
			stats.Vendor = "Intel"
		} else {
			stats.Vendor = vendorID
		}
	}

	// Try reading current clock frequency (supports older and newer Linux drm sysfs layouts)
	curFreqPaths := []string{
		filepath.Join(g.sysfsPath, "gt_cur_freq_mhz"),
		filepath.Join(g.sysfsPath, "gt", "gt0", "rps_act_freq_mhz"),
		filepath.Join(g.sysfsPath, "gt", "gt0", "rps_cur_freq_mhz"),
	}
	for _, p := range curFreqPaths {
		if val, err := readIntFromFile(p); err == nil && val > 0 {
			stats.CurFreqMHz = val
			break
		}
	}

	// Try reading max clock frequency
	maxFreqPaths := []string{
		filepath.Join(g.sysfsPath, "gt_max_freq_mhz"),
		filepath.Join(g.sysfsPath, "gt", "gt0", "rps_max_freq_mhz"),
	}
	for _, p := range maxFreqPaths {
		if val, err := readIntFromFile(p); err == nil && val > 0 {
			stats.MaxFreqMHz = val
			break
		}
	}

	// Estimate usage percentage from frequency scale if available
	if stats.MaxFreqMHz > 0 && stats.CurFreqMHz > 0 {
		pct := (float64(stats.CurFreqMHz) / float64(stats.MaxFreqMHz)) * 100.0
		stats.UsagePercent = math.Round(pct*10) / 10
	}

	return stats, nil
}

func readIntFromFile(path string) (int64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	trimmed := strings.TrimSpace(string(data))
	return strconv.ParseInt(trimmed, 10, 64)
}
