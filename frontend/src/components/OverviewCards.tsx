import React, { useEffect, useRef, useState } from 'react'
import { Cpu, HardDrive, MemoryStick, Activity, Zap, Server } from 'lucide-react'
import { KpiCard } from '@/components/ui/kpi-card'
import { formatBytes, formatSpeed, formatUptime } from '@/lib/utils'
import type { SystemSnapshot } from '@/types/metrics'

interface OverviewCardsProps {
  snapshot: SystemSnapshot | null
}

const HISTORY_SIZE = 16

export const OverviewCards: React.FC<OverviewCardsProps> = ({ snapshot }) => {
  // Rolling trends for sparklines
  const [cpuTrend, setCpuTrend] = useState<number[]>([10, 12, 14, 15, 12, 18, 16, 20])
  const [memTrend, setMemTrend] = useState<number[]>([40, 41, 41, 42, 42, 43, 42, 43])
  const [netTrend, setNetTrend] = useState<number[]>([100, 250, 400, 150, 320, 600, 480, 520])
  const [diskTrend, setDiskTrend] = useState<number[]>([20, 20, 20, 25, 30, 22, 28, 30])
  const [gpuTrend, setGpuTrend] = useState<number[]>([5, 8, 4, 12, 15, 8, 10, 14])

  const prevCpuRef = useRef<number>(0)
  const prevMemRef = useRef<number>(0)
  const prevNetRef = useRef<number>(0)

  const cpuPercent = snapshot?.cpu?.total_percent ?? 0
  const memUsedPercent = snapshot?.memory?.used_percent ?? 0
  const memUsedBytes = snapshot?.memory?.used_bytes ?? 0
  const memTotalBytes = snapshot?.memory?.total_bytes ?? 0

  const primaryDisk = snapshot?.disks?.[0]
  const diskUsedPercent = primaryDisk?.used_percent ?? 0
  const diskUsedBytes = primaryDisk?.used_bytes ?? 0
  const diskTotalBytes = primaryDisk?.total_bytes ?? 0

  let totalRx = 0
  let totalTx = 0
  if (snapshot?.networks) {
    for (const n of snapshot.networks) {
      totalRx += n.rx_bytes_per_sec || 0
      totalTx += n.tx_bytes_per_sec || 0
    }
  }
  const totalNetBps = totalRx + totalTx

  const gpu = snapshot?.gpu
  const gpuAvailable = gpu?.available ?? false
  const gpuUsage = gpu?.usage_percent ?? 0

  const [deltas, setDeltas] = useState<{ cpu?: number; mem?: number; net?: number }>({})

  // Update rolling history buffer and deltas when a new snapshot arrives
  useEffect(() => {
    if (!snapshot) return

    setCpuTrend((prev) => {
      const next = [...prev.slice(-(HISTORY_SIZE - 1)), Math.round(cpuPercent)]
      return next
    })

    setMemTrend((prev) => {
      const next = [...prev.slice(-(HISTORY_SIZE - 1)), Math.round(memUsedPercent)]
      return next
    })

    setNetTrend((prev) => {
      const next = [...prev.slice(-(HISTORY_SIZE - 1)), Math.max(1, Math.round(totalNetBps / 1024))]
      return next
    })

    if (primaryDisk) {
      const ioRateKb = Math.round(((primaryDisk.read_bytes_per_sec || 0) + (primaryDisk.write_bytes_per_sec || 0)) / 1024)
      setDiskTrend((prev) => [...prev.slice(-(HISTORY_SIZE - 1)), ioRateKb])
    }

    if (gpuAvailable) {
      setGpuTrend((prev) => [...prev.slice(-(HISTORY_SIZE - 1)), Math.round(gpuUsage)])
    }

    setDeltas({
      cpu: prevCpuRef.current > 0 ? (cpuPercent - prevCpuRef.current) / 100 : undefined,
      mem: prevMemRef.current > 0 ? (memUsedPercent - prevMemRef.current) / 100 : undefined,
      net: prevNetRef.current > 0 && totalNetBps > 0 ? (totalNetBps - prevNetRef.current) / prevNetRef.current : undefined,
    })

    if (cpuPercent > 0) prevCpuRef.current = cpuPercent
    if (memUsedPercent > 0) prevMemRef.current = memUsedPercent
    if (totalNetBps > 0) prevNetRef.current = totalNetBps
  }, [snapshot, cpuPercent, memUsedPercent, totalNetBps, primaryDisk, gpuAvailable, gpuUsage])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {/* CPU KPI Card */}
      <KpiCard
        label="CPU Utilization"
        icon={<Cpu className="text-[#2f5bff]" />}
        value={`${cpuPercent.toFixed(1)}%`}
        delta={deltas.cpu}
        invertDelta={true}
        trend={cpuTrend}
        className="hover:border-white/20 transition-colors"
      >
        <span className="text-[#969696] font-mono text-xs">
          {snapshot?.cpu?.core_count ? `${snapshot.cpu.core_count} Cores` : 'Host CPU'}
        </span>
      </KpiCard>

      {/* Memory KPI Card */}
      <KpiCard
        label="Memory In Use"
        icon={<MemoryStick className="text-[#00bb7f]" />}
        value={`${memUsedPercent.toFixed(1)}%`}
        delta={deltas.mem}
        invertDelta={true}
        trend={memTrend}
        className="hover:border-white/20 transition-colors"
      >
        <span className="text-[#969696] font-mono text-xs">
          {formatBytes(memUsedBytes)} / {formatBytes(memTotalBytes)}
        </span>
      </KpiCard>

      {/* Storage KPI Card */}
      <KpiCard
        label="Storage Used"
        icon={<HardDrive className="text-[#f99c00]" />}
        value={`${diskUsedPercent.toFixed(1)}%`}
        deltaLabel={primaryDisk ? primaryDisk.mount_point : '/'}
        trend={diskTrend}
        className="hover:border-white/20 transition-colors"
      >
        <span className="text-[#969696] font-mono text-xs">
          {formatBytes(diskUsedBytes)} / {formatBytes(diskTotalBytes)}
        </span>
      </KpiCard>

      {/* Network Traffic KPI Card */}
      <KpiCard
        label="Network Traffic"
        icon={<Activity className="text-[#ac4bff]" />}
        value={formatSpeed(totalNetBps)}
        delta={deltas.net}
        trend={netTrend}
        className="hover:border-white/20 transition-colors"
      >
        <span className="text-[#969696] whitespace-nowrap text-xs font-mono">
          ↓ {formatSpeed(totalRx)} · ↑ {formatSpeed(totalTx)}
        </span>
      </KpiCard>

      {/* GPU / Server Status Card */}
      {gpuAvailable ? (
        <KpiCard
          label="Intel iGPU Load"
          icon={<Zap className="text-[#ff2357]" />}
          value={`${gpuUsage.toFixed(1)}%`}
          trend={gpuTrend}
          deltaLabel={snapshot?.host ? `Up: ${formatUptime(snapshot.host.uptime_seconds)}` : undefined}
          className="hover:border-white/20 transition-colors"
        >
          <span className="text-[#969696] font-mono text-xs">
            {gpu?.cur_freq_mhz ? `${gpu.cur_freq_mhz} MHz` : 'Active DRM'}
          </span>
        </KpiCard>
      ) : (
        <KpiCard
          label="Server Uptime"
          icon={<Server className="text-[#00bb7f]" />}
          value={formatUptime(snapshot?.host?.uptime_seconds ?? 0)}
          deltaLabel="active"
          trend={[1, 2, 3, 4, 5, 6, 7, 8]}
          className="hover:border-white/20 transition-colors"
        >
          <span className="text-[#969696] font-mono text-[11px] truncate">
            {snapshot?.host?.hostname ?? 'host'}
          </span>
        </KpiCard>
      )}
    </div>
  )
}
