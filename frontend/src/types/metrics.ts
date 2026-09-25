export interface HostInfo {
  hostname: string
  os: string
  platform: string
  platform_family: string
  kernel_version: string
  uptime_seconds: number
  boot_time: string
  load_avg_1: number
  load_avg_5: number
  load_avg_15: number
}

export interface CPUStats {
  total_percent: number
  per_core_percent: number[]
  core_count: number
  model_name?: string
}

export interface MemoryStats {
  total_bytes: number
  used_bytes: number
  free_bytes: number
  available_bytes: number
  used_percent: number
  swap_total_bytes: number
  swap_used_bytes: number
  swap_free_bytes: number
  swap_used_percent: number
}

export interface DiskMetric {
  mount_point: string
  device: string
  fs_type?: string
  total_bytes: number
  used_bytes: number
  free_bytes: number
  used_percent: number
  read_bytes_per_sec: number
  write_bytes_per_sec: number
  read_ops_per_sec: number
  write_ops_per_sec: number
}

export interface NetworkMetric {
  interface: string
  rx_bytes_per_sec: number
  tx_bytes_per_sec: number
  rx_packets_per_sec: number
  tx_packets_per_sec: number
  total_rx_bytes: number
  total_tx_bytes: number
}

export interface GPUStats {
  available: boolean
  vendor?: string
  device_name?: string
  driver_version?: string
  cur_freq_mhz?: number
  max_freq_mhz?: number
  usage_percent?: number
  memory_used_bytes?: number
  memory_total_bytes?: number
}

export interface ContainerMetric {
  id: string
  name: string
  image: string
  state: 'running' | 'exited' | 'paused' | string
  status: string
  cpu_percent: number
  memory_used_bytes: number
  memory_limit_bytes: number
  memory_percent: number
  net_rx_bytes: number
  net_tx_bytes: number
  block_read_bytes: number
  block_write_bytes: number
}

export interface SystemSnapshot {
  timestamp: string
  host?: HostInfo
  cpu?: CPUStats
  memory?: MemoryStats
  disks?: DiskMetric[]
  networks?: NetworkMetric[]
  gpu?: GPUStats
  containers?: ContainerMetric[]
  docker_error?: string
}

export interface HistoricalMetricPoint {
  id?: number
  timestamp: number // unix epoch ms
  cpu_total: number
  mem_used_pct: number
  mem_used_bytes: number
  gpu_pct?: number
  net_rx_bps: number
  net_tx_bps: number
  disk_read_bps: number
  disk_write_bps: number
}
