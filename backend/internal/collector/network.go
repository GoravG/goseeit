package collector

import (
	"context"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/goravg/goseeit/internal/model"
	psnet "github.com/shirou/gopsutil/v4/net"
)

type netIOHistory struct {
	rxBytes   uint64
	txBytes   uint64
	rxPackets uint64
	txPackets uint64
	timestamp time.Time
}

// NetworkCollector monitors interface throughput and packet rates.
type NetworkCollector struct {
	targetIfaces []string
	mu           sync.Mutex
	lastIO       map[string]netIOHistory
}

// NewNetworkCollector creates a NetworkCollector with target interface names.
func NewNetworkCollector(targetIfaces []string) *NetworkCollector {
	return &NetworkCollector{
		targetIfaces: targetIfaces,
		lastIO:       make(map[string]netIOHistory),
	}
}

// Name returns the collector name.
func (n *NetworkCollector) Name() string {
	return "network"
}

// Collect returns throughput and packet rates per interface.
func (n *NetworkCollector) Collect(ctx context.Context) ([]model.NetworkMetric, error) {
	counters, err := psnet.IOCountersWithContext(ctx, true)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	n.mu.Lock()
	defer n.mu.Unlock()

	var results []model.NetworkMetric
	for _, c := range counters {
		if !n.isAllowedInterface(c.Name) {
			continue
		}

		metric := model.NetworkMetric{
			Interface:    c.Name,
			TotalRxBytes: c.BytesRecv,
			TotalTxBytes: c.BytesSent,
		}

		if prev, exists := n.lastIO[c.Name]; exists {
			dt := now.Sub(prev.timestamp).Seconds()
			if dt > 0.1 {
				if c.BytesRecv >= prev.rxBytes {
					metric.RxBytesPerSec = math.Round(float64(c.BytesRecv-prev.rxBytes)/dt*10) / 10
				}
				if c.BytesSent >= prev.txBytes {
					metric.TxBytesPerSec = math.Round(float64(c.BytesSent-prev.txBytes)/dt*10) / 10
				}
				if c.PacketsRecv >= prev.rxPackets {
					metric.RxPacketsPerSec = math.Round(float64(c.PacketsRecv-prev.rxPackets)/dt*10) / 10
				}
				if c.PacketsSent >= prev.txPackets {
					metric.TxPacketsPerSec = math.Round(float64(c.PacketsSent-prev.txPackets)/dt*10) / 10
				}
			}
		}

		n.lastIO[c.Name] = netIOHistory{
			rxBytes:   c.BytesRecv,
			txBytes:   c.BytesSent,
			rxPackets: c.PacketsRecv,
			txPackets: c.PacketsSent,
			timestamp: now,
		}

		results = append(results, metric)
	}

	return results, nil
}

func (n *NetworkCollector) isAllowedInterface(name string) bool {
	lower := strings.ToLower(name)
	// Skip loopback and common virtual / bridge noise unless specifically targeted
	if len(n.targetIfaces) == 0 {
		if lower == "lo" || strings.HasPrefix(lower, "veth") || strings.HasPrefix(lower, "docker") || strings.HasPrefix(lower, "br-") {
			return false
		}
		return true
	}

	for _, target := range n.targetIfaces {
		if strings.EqualFold(name, target) {
			return true
		}
	}
	return false
}
