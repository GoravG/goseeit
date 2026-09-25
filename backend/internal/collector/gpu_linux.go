//go:build linux

package collector

import (
	"context"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/goravg/goseeit/internal/model"
)

// GPUCollector gathers Intel GPU stats from Linux sysfs.
type GPUCollector struct {
	sysfsPath    string
	enabled      bool
	mu           sync.Mutex
	prevRC6Ms    int64
	prevSampleAt time.Time
	hasPrevRC6   bool
}

// NewGPUCollector constructs a GPUCollector for Linux.
func NewGPUCollector(sysfsPath string, enabled bool) *GPUCollector {
	resolved := resolveDrmPath(sysfsPath)
	return &GPUCollector{
		sysfsPath: resolved,
		enabled:   enabled,
	}
}

// resolveDrmPath locates the Intel DRM card sysfs directory.
func resolveDrmPath(customPath string) string {
	if customPath != "" {
		return customPath
	}

	baseDir := "/sys/class/drm"
	if hostSys := os.Getenv("HOST_SYS"); hostSys != "" {
		baseDir = filepath.Join(hostSys, "class/drm")
	}

	// 1. Check card0 first
	card0 := filepath.Join(baseDir, "card0")
	if isIntelDRM(card0) {
		return card0
	}

	// 2. Scan card0..card7 to locate an Intel GPU (vendor 0x8086)
	for i := 1; i <= 7; i++ {
		candidate := filepath.Join(baseDir, fmt.Sprintf("card%d", i))
		if isIntelDRM(candidate) {
			return candidate
		}
	}

	return card0
}

func isIntelDRM(cardPath string) bool {
	vendorBytes, err := os.ReadFile(filepath.Join(cardPath, "device", "vendor"))
	if err == nil {
		return strings.TrimSpace(string(vendorBytes)) == "0x8086"
	}
	return false
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

	// Re-verify path if not present (in case volume was mounted later)
	if _, err := os.Stat(g.sysfsPath); os.IsNotExist(err) {
		g.sysfsPath = resolveDrmPath("")
		if _, err := os.Stat(g.sysfsPath); os.IsNotExist(err) {
			return &model.GPUStats{Available: false}, nil
		}
	}

	stats := &model.GPUStats{
		Available:  true,
		Vendor:     "Intel",
		DeviceName: "Intel Integrated Graphics",
	}

	// Verify Vendor ID
	vendorBytes, err := os.ReadFile(filepath.Join(g.sysfsPath, "device", "vendor"))
	if err == nil {
		vendorID := strings.TrimSpace(string(vendorBytes))
		if vendorID == "0x8086" {
			stats.Vendor = "Intel"
		} else {
			stats.Vendor = vendorID
		}
	}

	// Try reading device ID for richer identification (e.g. 0x9a49)
	if devBytes, err := os.ReadFile(filepath.Join(g.sysfsPath, "device", "device")); err == nil {
		devID := strings.TrimSpace(string(devBytes))
		if devID != "" {
			stats.DeviceName = fmt.Sprintf("Intel Integrated Graphics (%s)", devID)
		}
	}

	// Check driver version / module name
	if drvLink, err := os.Readlink(filepath.Join(g.sysfsPath, "device", "driver")); err == nil {
		stats.DriverVersion = filepath.Base(drvLink)
	}

	// Check runtime power management status
	// If suspended, the GPU is in deep power-down idle (usage = 0.0%)
	isSuspended := false
	runtimeStatusPaths := []string{
		"power/runtime_status",
		"device/power/runtime_status",
	}
	for _, rp := range runtimeStatusPaths {
		if data, err := os.ReadFile(filepath.Join(g.sysfsPath, rp)); err == nil {
			if strings.TrimSpace(string(data)) == "suspended" {
				isSuspended = true
				break
			}
		}
	}

	// Read Current / Actual clock frequency
	curFreq, hasCur := readFirstInt(g.sysfsPath,
		"gt/gt0/rps_act_freq_mhz",
		"gt_act_freq_mhz",
		"gt/gt0/rps_cur_freq_mhz",
		"gt_cur_freq_mhz",
		"gt/rps_act_freq_mhz",
		"gt/rps_cur_freq_mhz",
	)
	if hasCur && curFreq > 0 {
		stats.CurFreqMHz = curFreq
	}

	// Read Min clock frequency
	minFreq, hasMin := readFirstInt(g.sysfsPath,
		"gt/gt0/rps_min_freq_mhz",
		"gt_min_freq_mhz",
		"gt/gt0/rps_RPn_freq_mhz",
		"gt_RPn_freq_mhz",
		"gt/rps_min_freq_mhz",
	)

	// Read Max clock frequency
	maxFreq, hasMax := readFirstInt(g.sysfsPath,
		"gt/gt0/rps_max_freq_mhz",
		"gt_max_freq_mhz",
		"gt/gt0/rps_RP0_freq_mhz",
		"gt_RP0_freq_mhz",
		"gt/rps_max_freq_mhz",
	)
	if hasMax && maxFreq > 0 {
		stats.MaxFreqMHz = maxFreq
	}

	// Try reading RC6 residency (render sleep state duration in ms)
	// Measuring delta RC6 residency over delta time is the standard Linux method
	// for computing Intel GPU busy percentage (used by intel_gpu_top).
	rc6Ms, hasRC6 := readFirstInt(g.sysfsPath,
		"gt/gt0/rc6_residency_ms",
		"gt_rc6_residency_ms",
		"power/rc6_residency_ms",
		"gt/rc6_residency_ms",
	)

	g.mu.Lock()
	defer g.mu.Unlock()

	now := time.Now()
	calculatedUsage := false

	if isSuspended {
		// Deep idle / suspended state
		stats.UsagePercent = 0.0
		calculatedUsage = true
	} else if hasRC6 && g.hasPrevRC6 {
		deltaMs := now.Sub(g.prevSampleAt).Milliseconds()
		deltaRC6 := rc6Ms - g.prevRC6Ms
		// Only calculate if reasonable sampling interval has elapsed
		if deltaMs >= 200 && deltaRC6 >= 0 {
			if deltaRC6 > deltaMs {
				deltaRC6 = deltaMs // Clamp to 100% idle
			}
			rc6Fraction := float64(deltaRC6) / float64(deltaMs)
			busyFraction := 1.0 - rc6Fraction
			if busyFraction < 0.0 {
				busyFraction = 0.0
			}
			stats.UsagePercent = math.Round(busyFraction*1000.0) / 10.0
			calculatedUsage = true
		}
	}

	// Update baseline RC6 tracker
	if hasRC6 {
		g.prevRC6Ms = rc6Ms
		g.prevSampleAt = now
		g.hasPrevRC6 = true
	}

	// Fallback to frequency scaling if RC6 delta wasn't available
	if !calculatedUsage {
		if isSuspended {
			stats.UsagePercent = 0.0
		} else if hasCur && hasMax && stats.MaxFreqMHz > 0 {
			// If min frequency is known, scale relative to [min, max]
			if hasMin && minFreq > 0 && stats.MaxFreqMHz > minFreq {
				if stats.CurFreqMHz <= minFreq {
					stats.UsagePercent = 0.0
				} else {
					pct := (float64(stats.CurFreqMHz-minFreq) / float64(stats.MaxFreqMHz-minFreq)) * 100.0
					stats.UsagePercent = math.Min(100.0, math.Max(0.0, math.Round(pct*10)/10))
				}
			} else {
				// No min frequency file found: if frequency is <= 25% of max, it's sitting at idle p-state
				pct := (float64(stats.CurFreqMHz) / float64(stats.MaxFreqMHz)) * 100.0
				if pct <= 25.0 {
					stats.UsagePercent = 0.0
				} else {
					stats.UsagePercent = math.Min(100.0, math.Max(0.0, math.Round(pct*10)/10))
				}
			}
		}
	}

	return stats, nil
}

func readFirstInt(basePath string, relPaths ...string) (int64, bool) {
	for _, rel := range relPaths {
		p := filepath.Join(basePath, rel)
		if val, err := readIntFromFile(p); err == nil && val >= 0 {
			return val, true
		}
	}
	return 0, false
}

func readIntFromFile(path string) (int64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	trimmed := strings.TrimSpace(string(data))
	return strconv.ParseInt(trimmed, 10, 64)
}
