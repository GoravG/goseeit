import React from 'react'
import { HardDrive, Network, ArrowDown, ArrowUp, Disc } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Progress } from './ui/progress'
import { formatBytes, formatSpeed } from '@/lib/utils'
import type { DiskMetric, NetworkMetric } from '@/types/metrics'

interface DiskAndNetworkProps {
  disks?: DiskMetric[]
  networks?: NetworkMetric[]
}

export const DiskAndNetworkSection: React.FC<DiskAndNetworkProps> = ({ disks = [], networks = [] }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Storage & Disk I/O */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <CardTitle>Storage & Disk I/O</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {disks.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No disks tracked in configuration</div>
          ) : (
            disks.map((d, i) => (
              <div key={i} className="glass-panel-subtle p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-200">
                    <Disc className="w-3.5 h-3.5 text-amber-400" />
                    <span>{d.mount_point}</span>
                    <span className="text-slate-500 font-mono">({d.device})</span>
                    {d.fs_type && <span className="text-slate-500 uppercase text-[10px]">[{d.fs_type}]</span>}
                  </div>
                  <div className="text-slate-300 font-mono">
                    {formatBytes(d.used_bytes)} / {formatBytes(d.total_bytes)} ({d.used_percent.toFixed(1)}%)
                  </div>
                </div>

                <Progress
                  value={d.used_percent}
                  indicatorClassName={d.used_percent > 90 ? 'bg-rose-500' : 'bg-amber-400'}
                  className="h-2"
                />

                {/* Real-time I/O Rates */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-emerald-400">Read: {formatSpeed(d.read_bytes_per_sec)}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-sky-400">Write: {formatSpeed(d.write_bytes_per_sec)}</span>
                  </div>
                  {(d.read_ops_per_sec > 0 || d.write_ops_per_sec > 0) && (
                    <div className="font-mono text-slate-500">
                      IOPS: {(d.read_ops_per_sec + d.write_ops_per_sec).toFixed(0)}/s
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Network Interfaces */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-400" />
            <CardTitle>Network Interfaces</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {networks.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">No active interfaces detected</div>
          ) : (
            networks.map((net, i) => (
              <div key={i} className="glass-panel-subtle p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-medium text-slate-200">{net.interface}</span>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Total: ↓{formatBytes(net.total_rx_bytes)} ↑{formatBytes(net.total_tx_bytes)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/40">
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-400">Down:</span>
                    <span className="text-emerald-300 font-semibold">{formatSpeed(net.rx_bytes_per_sec)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <ArrowUp className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-slate-400">Up:</span>
                    <span className="text-sky-300 font-semibold">{formatSpeed(net.tx_bytes_per_sec)}</span>
                  </div>
                </div>

                {(net.rx_packets_per_sec > 0 || net.tx_packets_per_sec > 0) && (
                  <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                    <span>Packets: {net.rx_packets_per_sec.toFixed(0)} rx/s</span>
                    <span>{net.tx_packets_per_sec.toFixed(0)} tx/s</span>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
