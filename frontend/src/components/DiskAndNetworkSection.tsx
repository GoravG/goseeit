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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#f99c00]/10 border border-[#f99c00]/20 text-[#f99c00]">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[#ededed]">
                  Storage Volumes & Mounts
                </CardTitle>
                <div className="text-xs text-[#969696]">Filesystem capacity & real-time block I/O</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5">
          {disks.length === 0 ? (
            <div className="text-xs text-[#6d6d6d] py-8 text-center">
              No storage mount points detected
            </div>
          ) : (
            disks.map((d, i) => (
              <div key={i} className="bg-[#1c1c1e] border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-[#ededed]">
                    <Disc className="w-4 h-4 text-[#f99c00]" />
                    <span className="font-semibold text-[#ededed]">{d.mount_point}</span>
                    <span className="text-[#969696] font-mono text-[11px]">({d.device})</span>
                    {d.fs_type && (
                      <span className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-[#969696] font-mono text-[10px] uppercase border border-white/5">
                        {d.fs_type}
                      </span>
                    )}
                  </div>
                  <div className="text-[#c2c2c2] font-mono text-xs">
                    {formatBytes(d.used_bytes)} / {formatBytes(d.total_bytes)} (
                    <span
                      className={`font-semibold ${
                        d.used_percent > 90
                          ? 'text-[#ff6568]'
                          : d.used_percent > 75
                            ? 'text-[#f99c00]'
                            : 'text-[#00bb7f]'
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
                <div className="flex items-center justify-between text-[11px] text-[#969696] pt-2 border-t border-white/5">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[#00bb7f] flex items-center gap-1">
                      <ArrowDown className="w-3 h-3" />
                      Read: {formatSpeed(d.read_bytes_per_sec)}
                    </span>
                    <span className="text-[#4e4e4e]">|</span>
                    <span className="text-[#2f5bff] flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" />
                      Write: {formatSpeed(d.write_bytes_per_sec)}
                    </span>
                  </div>
                  {(d.read_ops_per_sec > 0 || d.write_ops_per_sec > 0) && (
                    <div className="font-mono text-[#969696] text-[11px]">
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#2f5bff]/10 border border-[#2f5bff]/20 text-[#2f5bff]">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-[#ededed]">
                  Network Adapters
                </CardTitle>
                <div className="text-xs text-[#969696]">Throughput rates & total byte transfer</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3.5">
          {networks.length === 0 ? (
            <div className="text-xs text-[#6d6d6d] py-8 text-center">
              No active network interfaces detected
            </div>
          ) : (
            networks.map((n, i) => (
              <div key={i} className="bg-[#1c1c1e] border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-mono font-semibold text-[#ededed]">
                    <Wifi className="w-4 h-4 text-[#2f5bff]" />
                    <span>{n.interface}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[#969696]">
                    <span>Packets:</span>
                    <span className="text-[#00bb7f] font-semibold">{n.rx_packets_per_sec}/s</span>
                    <span className="text-[#4e4e4e]">/</span>
                    <span className="text-[#2f5bff] font-semibold">{n.tx_packets_per_sec}/s</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#242424] border border-white/5">
                    <div className="flex items-center justify-between text-[11px] text-[#969696] mb-1">
                      <span className="flex items-center gap-1 text-[#00bb7f] font-medium">
                        <ArrowDown className="w-3.5 h-3.5" /> Download
                      </span>
                      <span className="font-mono text-[#ededed] font-semibold">
                        {formatSpeed(n.rx_bytes_per_sec)}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#969696] font-mono text-right">
                      Total: {formatBytes(n.total_rx_bytes)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#242424] border border-white/5">
                    <div className="flex items-center justify-between text-[11px] text-[#969696] mb-1">
                      <span className="flex items-center gap-1 text-[#2f5bff] font-medium">
                        <ArrowUp className="w-3.5 h-3.5" /> Upload
                      </span>
                      <span className="font-mono text-[#ededed] font-semibold">
                        {formatSpeed(n.tx_bytes_per_sec)}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#969696] font-mono text-right">
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
