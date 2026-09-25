package model

import "time"

// SystemSnapshot aggregates all metric snapshots taken at a point in time.
type SystemSnapshot struct {
	Timestamp   time.Time         `json:"timestamp"`
	Host        *HostInfo         `json:"host,omitempty"`
	CPU         *CPUStats         `json:"cpu,omitempty"`
	Memory      *MemoryStats      `json:"memory,omitempty"`
	Disks       []DiskMetric      `json:"disks,omitempty"`
	Networks    []NetworkMetric   `json:"networks,omitempty"`
	GPU         *GPUStats         `json:"gpu,omitempty"`
	Containers  []ContainerMetric `json:"containers,omitempty"`
	DockerError string            `json:"docker_error,omitempty"`
}

// HostInfo contains general host status and uptime.
type HostInfo struct {
	Hostname       string    `json:"hostname"`
	OS             string    `json:"os"`
	Platform       string    `json:"platform"`
	PlatformFamily string    `json:"platform_family"`
	KernelVersion  string    `json:"kernel_version"`
	UptimeSeconds  uint64    `json:"uptime_seconds"`
	BootTime       time.Time `json:"boot_time"`
	LoadAvg1       float64   `json:"load_avg_1"`
	LoadAvg5       float64   `json:"load_avg_5"`
	LoadAvg15      float64   `json:"load_avg_15"`
}

// CPUStats holds total and per-core CPU percentages.
type CPUStats struct {
	TotalPercent   float64   `json:"total_percent"`
	PerCorePercent []float64 `json:"per_core_percent"`
	CoreCount      int       `json:"core_count"`
	ModelName      string    `json:"model_name,omitempty"`
}

// MemoryStats holds RAM and Swap metrics in bytes and percentages.
type MemoryStats struct {
	TotalBytes      uint64  `json:"total_bytes"`
	UsedBytes       uint64  `json:"used_bytes"`
	FreeBytes       uint64  `json:"free_bytes"`
	AvailableBytes  uint64  `json:"available_bytes"`
	UsedPercent     float64 `json:"used_percent"`
	SwapTotalBytes  uint64  `json:"swap_total_bytes"`
	SwapUsedBytes   uint64  `json:"swap_used_bytes"`
	SwapFreeBytes   uint64  `json:"swap_free_bytes"`
	SwapUsedPercent float64 `json:"swap_used_percent"`
}

// DiskMetric combines filesystem capacity and real-time I/O rates.
type DiskMetric struct {
	MountPoint        string  `json:"mount_point"`
	Device            string  `json:"device"`
	FSType            string  `json:"fs_type,omitempty"`
	TotalBytes        uint64  `json:"total_bytes"`
	UsedBytes         uint64  `json:"used_bytes"`
	FreeBytes         uint64  `json:"free_bytes"`
	UsedPercent       float64 `json:"used_percent"`
	ReadBytesPerSec   float64 `json:"read_bytes_per_sec"`
	WriteBytesPerSec  float64 `json:"write_bytes_per_sec"`
	ReadOpsPerSec     float64 `json:"read_ops_per_sec"`
	WriteOpsPerSec    float64 `json:"write_ops_per_sec"`
}

// NetworkMetric holds per-interface real-time traffic speeds.
type NetworkMetric struct {
	Interface        string  `json:"interface"`
	RxBytesPerSec    float64 `json:"rx_bytes_per_sec"`
	TxBytesPerSec    float64 `json:"tx_bytes_per_sec"`
	RxPacketsPerSec  float64 `json:"rx_packets_per_sec"`
	TxPacketsPerSec  float64 `json:"tx_packets_per_sec"`
	TotalRxBytes     uint64  `json:"total_rx_bytes"`
	TotalTxBytes     uint64  `json:"total_tx_bytes"`
}

// GPUStats holds GPU clock, memory, and engine metrics.
type GPUStats struct {
	Available        bool    `json:"available"`
	Vendor           string  `json:"vendor,omitempty"`
	DeviceName       string  `json:"device_name,omitempty"`
	DriverVersion    string  `json:"driver_version,omitempty"`
	CurFreqMHz       int64   `json:"cur_freq_mhz,omitempty"`
	MaxFreqMHz       int64   `json:"max_freq_mhz,omitempty"`
	UsagePercent     float64 `json:"usage_percent,omitempty"`
	MemoryUsedBytes  uint64  `json:"memory_used_bytes,omitempty"`
	MemoryTotalBytes uint64  `json:"memory_total_bytes,omitempty"`
}

// ContainerMetric represents health and resource usage for a Docker container.
type ContainerMetric struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Image            string  `json:"image"`
	State            string  `json:"state"`  // running, exited, paused
	Status           string  `json:"status"` // e.g., "Up 2 hours"
	CPUPercent       float64 `json:"cpu_percent"`
	MemoryUsedBytes  uint64  `json:"memory_used_bytes"`
	MemoryLimitBytes uint64  `json:"memory_limit_bytes"`
	MemoryPercent    float64 `json:"memory_percent"`
	NetRxBytes       uint64  `json:"net_rx_bytes"`
	NetTxBytes       uint64  `json:"net_tx_bytes"`
	BlockReadBytes   uint64  `json:"block_read_bytes"`
	BlockWriteBytes  uint64  `json:"block_write_bytes"`
}
