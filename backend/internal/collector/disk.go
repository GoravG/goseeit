package collector

import (
	"context"
	"log"
	"math"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/goravg/goseeit/internal/model"
	"github.com/shirou/gopsutil/v4/disk"
)

type diskIOHistory struct {
	readBytes  uint64
	writeBytes uint64
	readCount  uint64
	writeCount uint64
	timestamp  time.Time
}

// DiskCollector monitors filesystem capacity and disk I/O rates.
type DiskCollector struct {
	targetDisks []string
	mu          sync.Mutex
	lastIO      map[string]diskIOHistory
}

// NewDiskCollector creates a DiskCollector with target disks/mountpoints.
func NewDiskCollector(targets []string) *DiskCollector {
	return &DiskCollector{
		targetDisks: targets,
		lastIO:      make(map[string]diskIOHistory),
	}
}

// Name returns the collector name.
func (d *DiskCollector) Name() string {
	return "disk"
}

// Collect returns space and I/O rates for configured disks.
func (d *DiskCollector) Collect(ctx context.Context) ([]model.DiskMetric, error) {
	partitions, err := disk.PartitionsWithContext(ctx, true)
	if err != nil {
		// Fallback to minimal root partition check if PartitionsWithContext fails
		partitions = []disk.PartitionStat{{Mountpoint: "/", Device: "/"}}
	}

	ioCounters, err := disk.IOCountersWithContext(ctx)
	if err != nil && ctx.Err() == nil {
		log.Printf("[Collector:disk] Notice: I/O counters unavailable: %v", err)
	}

	now := time.Now()
	d.mu.Lock()
	defer d.mu.Unlock()

	var results []model.DiskMetric
	seenMounts := make(map[string]bool)

	for _, p := range partitions {
		// Filter by target list if specified
		if len(d.targetDisks) > 0 && !d.matchesTarget(p.Mountpoint, p.Device) {
			continue
		}
		if seenMounts[p.Mountpoint] {
			continue
		}
		seenMounts[p.Mountpoint] = true

		usage, err := disk.UsageWithContext(ctx, p.Mountpoint)
		if err != nil {
			continue
		}

		metric := model.DiskMetric{
			MountPoint:  p.Mountpoint,
			Device:      p.Device,
			FSType:      p.Fstype,
			TotalBytes:  usage.Total,
			UsedBytes:   usage.Used,
			FreeBytes:   usage.Free,
			UsedPercent: math.Round(usage.UsedPercent*10) / 10,
		}

		// Calculate I/O rates if device counters exist
		devName := filepath.Base(p.Device)
		if io, ok := ioCounters[devName]; ok {
			if prev, exists := d.lastIO[devName]; exists {
				dt := now.Sub(prev.timestamp).Seconds()
				if dt > 0.1 {
					if io.ReadBytes >= prev.readBytes {
						metric.ReadBytesPerSec = math.Round(float64(io.ReadBytes-prev.readBytes)/dt*10) / 10
					}
					if io.WriteBytes >= prev.writeBytes {
						metric.WriteBytesPerSec = math.Round(float64(io.WriteBytes-prev.writeBytes)/dt*10) / 10
					}
					if io.ReadCount >= prev.readCount {
						metric.ReadOpsPerSec = math.Round(float64(io.ReadCount-prev.readCount)/dt*10) / 10
					}
					if io.WriteCount >= prev.writeCount {
						metric.WriteOpsPerSec = math.Round(float64(io.WriteCount-prev.writeCount)/dt*10) / 10
					}
				}
			}
			d.lastIO[devName] = diskIOHistory{
				readBytes:  io.ReadBytes,
				writeBytes: io.WriteBytes,
				readCount:  io.ReadCount,
				writeCount: io.WriteCount,
				timestamp:  now,
			}
		}

		results = append(results, metric)
	}

	// If no partitions matched (e.g. targets were device paths not mountpoints), try root
	if len(results) == 0 {
		if usage, err := disk.UsageWithContext(ctx, "/"); err == nil {
			results = append(results, model.DiskMetric{
				MountPoint:  "/",
				Device:      "root",
				TotalBytes:  usage.Total,
				UsedBytes:   usage.Used,
				FreeBytes:   usage.Free,
				UsedPercent: math.Round(usage.UsedPercent*10) / 10,
			})
		}
	}

	return results, nil
}

func (d *DiskCollector) matchesTarget(mount, device string) bool {
	mountClean := filepath.Clean(mount)
	devBase := filepath.Base(device)

	for _, target := range d.targetDisks {
		tClean := filepath.Clean(target)
		tBase := filepath.Base(target)

		if mountClean == tClean || device == target || devBase == tBase || strings.HasPrefix(devBase, tBase) {
			return true
		}
	}
	return false
}
