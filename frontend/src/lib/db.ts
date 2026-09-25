import Dexie, { type Table } from 'dexie'
import type { HistoricalMetricPoint, SystemSnapshot } from '@/types/metrics'

export class MetricsDatabase extends Dexie {
  metrics!: Table<HistoricalMetricPoint, number>

  constructor() {
    super('goseeit_db')
    this.version(1).stores({
      metrics: '++id, timestamp',
    })
  }

  // Record a new snapshot from WebSocket
  async recordSnapshot(snap: SystemSnapshot) {
    const epoch = new Date(snap.timestamp).getTime() || Date.now()

    let netRx = 0
    let netTx = 0
    if (snap.networks) {
      for (const n of snap.networks) {
        netRx += n.rx_bytes_per_sec || 0
        netTx += n.tx_bytes_per_sec || 0
      }
    }

    let diskRead = 0
    let diskWrite = 0
    if (snap.disks) {
      for (const d of snap.disks) {
        diskRead += d.read_bytes_per_sec || 0
        diskWrite += d.write_bytes_per_sec || 0
      }
    }

    const point: HistoricalMetricPoint = {
      timestamp: epoch,
      cpu_total: snap.cpu?.total_percent || 0,
      mem_used_pct: snap.memory?.used_percent || 0,
      mem_used_bytes: snap.memory?.used_bytes || 0,
      gpu_pct: snap.gpu?.available ? snap.gpu.usage_percent : undefined,
      net_rx_bps: netRx,
      net_tx_bps: netTx,
      disk_read_bps: diskRead,
      disk_write_bps: diskWrite,
    }

    await this.metrics.add(point)
  }

  // Purge records older than retention hours (default: 24 hours)
  async pruneOldRecords(hours = 24) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    await this.metrics.where('timestamp').below(cutoff).delete()
  }

  // Fetch points aggregated into buckets over a requested time window
  async getAggregatedPoints(windowMinutes: number, targetBuckets = 60): Promise<HistoricalMetricPoint[]> {
    const now = Date.now()
    const fromTime = now - windowMinutes * 60 * 1000

    const raw = await this.metrics
      .where('timestamp')
      .aboveOrEqual(fromTime)
      .sortBy('timestamp')

    if (raw.length <= targetBuckets) {
      return raw
    }

    // Downsample into buckets
    const bucketDuration = (now - fromTime) / targetBuckets
    const result: HistoricalMetricPoint[] = []

    let bucketStart = fromTime
    let bucketPoints: HistoricalMetricPoint[] = []

    for (const p of raw) {
      if (p.timestamp < bucketStart + bucketDuration) {
        bucketPoints.push(p)
      } else {
        if (bucketPoints.length > 0) {
          result.push(averagePoints(bucketPoints, bucketStart + bucketDuration / 2))
        }
        bucketStart += bucketDuration
        bucketPoints = [p]
      }
    }
    if (bucketPoints.length > 0) {
      result.push(averagePoints(bucketPoints, bucketStart + bucketDuration / 2))
    }

    return result
  }
}

function averagePoints(points: HistoricalMetricPoint[], timestamp: number): HistoricalMetricPoint {
  const count = points.length
  let cpu = 0
  let memPct = 0
  let memBytes = 0
  let netRx = 0
  let netTx = 0
  let diskR = 0
  let diskW = 0
  let gpuSum = 0
  let gpuCount = 0

  for (const p of points) {
    cpu += p.cpu_total
    memPct += p.mem_used_pct
    memBytes += p.mem_used_bytes
    netRx += p.net_rx_bps
    netTx += p.net_tx_bps
    diskR += p.disk_read_bps
    diskW += p.disk_write_bps
    if (p.gpu_pct !== undefined) {
      gpuSum += p.gpu_pct
      gpuCount++
    }
  }

  return {
    timestamp,
    cpu_total: Math.round((cpu / count) * 10) / 10,
    mem_used_pct: Math.round((memPct / count) * 10) / 10,
    mem_used_bytes: Math.round(memBytes / count),
    gpu_pct: gpuCount > 0 ? Math.round((gpuSum / gpuCount) * 10) / 10 : undefined,
    net_rx_bps: Math.round(netRx / count),
    net_tx_bps: Math.round(netTx / count),
    disk_read_bps: Math.round(diskR / count),
    disk_write_bps: Math.round(diskW / count),
  }
}

export const db = new MetricsDatabase()
