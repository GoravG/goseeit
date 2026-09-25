import React from 'react'
import { HardDrive, Network, ArrowDown, ArrowUp, Disc, Wifi } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { SegmentedMeter, type MeterZone } from '@/components/ui/segmented-meter'
import { formatBytes, formatSpeed } from '@/lib/utils'
import type { DiskMetric, NetworkMetric } from '@/types/metrics'

interface DiskAndNetworkProps {
  disks?: DiskMetric[]
  networks?: NetworkMetric[]
}

const diskZones: MeterZone[] = [
  { label: 'Normal', from: 0, to: 75, color: 'var(--color-emerald-500)' },
  { label: 'Warning', from: 75, to: 90, color: 'var(--color-amber-500)' },
  { label: 'Critical', from: 90, to: 100, color: 'var(--color-red-500)' },
]

export const DiskAndNetworkSection: React.FC<DiskAndNetworkProps> = ({
  disks = [],
  networks = [],
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Storage & Disk Volumes */}
      <Card className="glass-panel border-white/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-white">
                  Storage Volumes & Mounts
                </CardTitle>
                <div className="text-xs text-slate-400">Filesystem capacity & real-time block I/O</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5">
          {disks.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">
              No storage mount points detected
            </div>
          ) : (
            disks.map((d, i) => (
              <div key={i} className="glass-panel-subtle p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <Disc className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-slate-100">{d.mount_point}</span>
                    <span className="text-slate-500 font-mono text-[11px]">({d.device})</span>
                    {d.fs_type && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                        {d.fs_type}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-300 font-mono text-xs">
                    {formatBytes(d.used_bytes)} / {formatBytes(d.total_bytes)} (
                    <span
                      className={`font-semibold ${
                        d.used_percent > 90
                          ? 'text-rose-400'
                          : d.used_percent > 75
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                      }`}
                    >
                      {d.used_percent.toFixed(1)}%
                    </span>
                    )
                  </div>
                </div>

                {/* Segmented meter for disk thresholds */}
                <SegmentedMeter
                  value={Math.min(100, Math.max(0, d.used_percent))}
                  zones={diskZones}
                  showTicks={false}
                  showLabels={false}
                  className="py-0.5"
                />

                {/* Real-time I/O Rates */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ArrowDown className="w-3 h-3" />
                      Read: {formatSpeed(d.read_bytes_per_sec)}
                    </span>
                    <span className="text-slate-700">|</span>
                    <span className="text-sky-400 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" />
                      Write: {formatSpeed(d.write_bytes_per_sec)}
                    </span>
                  </div>
                  {(d.read_ops_per_sec > 0 || d.write_ops_per_sec > 0) && (
                    <div className="font-mono text-slate-400 text-[11px]">
                      {(d.read_ops_per_sec + d.write_ops_per_sec).toFixed(0)} IOPS
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Network Interfaces */}
      <Card className="glass-panel border-white/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-white">
                  Network Adapters
                </CardTitle>
                <div className="text-xs text-slate-400">Throughput rates & total byte transfer</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5">
          {networks.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">
              No active network interfaces detected
            </div>
          ) : (
            networks.map((n, i) => (
              <div key={i} className="glass-panel-subtle p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono font-semibold text-slate-200">
                    <Wifi className="w-4 h-4 text-indigo-400" />
                    <span>{n.interface}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>Packets:</span>
                    <span className="text-emerald-400">{n.rx_packets_per_sec}/s</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-sky-400">{n.tx_packets_per_sec}/s</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <ArrowDown className="w-3.5 h-3.5" /> Download
                      </span>
                      <span className="font-mono text-slate-300 font-semibold">
                        {formatSpeed(n.rx_bytes_per_sec)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono text-right">
                      Total: {formatBytes(n.total_rx_bytes)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1 text-sky-400 font-medium">
                        <ArrowUp className="w-3.5 h-3.5" /> Upload
                      </span>
                      <span className="font-mono text-slate-300 font-semibold">
                        {formatSpeed(n.tx_bytes_per_sec)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono text-right">
                      Total: {formatBytes(n.total_tx_bytes)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
