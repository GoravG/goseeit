import React, { useMemo } from 'react'
import { Box, AlertCircle, Play, Square, Pause } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DataTable,
  DataTableColumnHeader,
  createDataTableColumnHelper,
} from '@/components/ui/data-table'
import { formatBytes } from '@/lib/utils'
import type { ContainerMetric } from '@/types/metrics'

interface DockerSectionProps {
  containers?: ContainerMetric[]
  dockerError?: string
}

const helper = createDataTableColumnHelper<ContainerMetric>()

export const DockerSection: React.FC<DockerSectionProps> = ({ containers = [], dockerError }) => {
  const runningCount = containers.filter((c) => c.state === 'running').length

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Container" />,
          cell: ({ row }) => {
            const c = row.original
            const isRunning = c.state === 'running'
            return (
              <div className="flex items-center gap-2.5 py-1">
                <div
                  className={`p-1.5 rounded-lg border ${
                    isRunning
                      ? 'bg-[#00bb7f]/10 border-[#00bb7f]/30 text-[#00bb7f]'
                      : 'bg-[#242424] border-white/5 text-[#6d6d6d]'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-sans font-semibold text-[#ededed] flex items-center gap-2">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-[#969696] font-mono">
                    {c.id.slice(0, 12)}
                  </div>
                </div>
              </div>
            )
          },
        }),
        helper.accessor('state', {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => {
            const state = row.original.state
            const status = row.original.status
            const isRunning = state === 'running'
            const isPaused = state === 'paused'

            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  {isRunning ? (
                    <span className="flex items-center gap-1 text-[#00bb7f] font-medium text-xs">
                      <Play className="w-3 h-3 fill-[#00bb7f]/20" /> Running
                    </span>
                  ) : isPaused ? (
                    <span className="flex items-center gap-1 text-[#f99c00] font-medium text-xs">
                      <Pause className="w-3 h-3" /> Paused
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[#ff6568] font-medium text-xs">
                      <Square className="w-3 h-3" /> Exited
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#969696] truncate max-w-[140px] font-sans">
                  {status}
                </div>
              </div>
            )
          },
        }),
        helper.accessor('image', {
          header: ({ column }) => <DataTableColumnHeader column={column} title="Image" />,
          cell: ({ row }) => (
            <div className="font-mono text-xs text-[#c2c2c2] truncate max-w-[180px]">
              {row.original.image}
            </div>
          ),
        }),
        helper.accessor('cpu_percent', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="CPU %" align="right" />
          ),
          cell: ({ row }) => {
            const cpu = row.original.cpu_percent
            return (
              <div className="flex flex-col items-end gap-1 min-w-[70px]">
                <span
                  className={`font-mono text-xs font-semibold ${
                    cpu > 80 ? 'text-[#ff6568]' : cpu > 40 ? 'text-[#f99c00]' : 'text-[#ededed]'
                  }`}
                >
                  {cpu.toFixed(1)}%
                </span>
                <Progress
                  value={cpu}
                  indicatorClassName={
                    cpu > 80 ? 'bg-[#fb2c36]' : cpu > 40 ? 'bg-[#f99c00]' : 'bg-[#2f5bff]'
                  }
                  className="h-1 w-14 bg-[#2a2a2a]"
                />
              </div>
            )
          },
        }),
        helper.accessor('memory_used_bytes', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Memory" align="right" />
          ),
          cell: ({ row }) => {
            const c = row.original
            return (
              <div className="flex flex-col items-end gap-0.5 text-right font-mono">
                <span className="text-xs text-[#ededed] font-medium">
                  {formatBytes(c.memory_used_bytes)}
                </span>
                <span className="text-[10px] text-[#969696]">
                  {c.memory_percent.toFixed(1)}% of {formatBytes(c.memory_limit_bytes)}
                </span>
              </div>
            )
          },
        }),
        helper.accessor('net_rx_bytes', {
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Network I/O" align="right" />
          ),
          cell: ({ row }) => {
            const c = row.original
            return (
              <div className="text-right font-mono text-xs text-[#c2c2c2]">
                <span className="text-[#00bb7f]">↓ {formatBytes(c.net_rx_bytes)}</span>
                <span className="text-[#4e4e4e] mx-1">/</span>
                <span className="text-[#2f5bff]">↑ {formatBytes(c.net_tx_bytes)}</span>
              </div>
            )
          },
        }),
      ]),
    []
  )

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2f5bff]/10 border border-[#2f5bff]/20 text-[#2f5bff]">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[#ededed]">
                Docker Containers
              </CardTitle>
              <div className="text-xs text-[#969696]">
                Real-time daemon inspection via <code className="text-[#ededed] bg-[#2a2a2a] px-1 py-0.5 rounded text-[11px]">/var/run/docker.sock</code>
              </div>
            </div>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-xs border-white/10 bg-[#1c1c1e] px-3 py-1"
          >
            <span className="text-[#00bb7f] font-bold mr-1">{runningCount}</span>
            <span className="text-[#969696]">/ {containers.length} Running</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {dockerError ? (
          <div className="flex items-center gap-2.5 p-3.5 text-xs bg-[#f99c00]/10 border border-[#f99c00]/20 text-[#f99c00] rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#f99c00]" />
            <span>Docker daemon unavailable: {dockerError}</span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={containers}
            searchKey="name"
            searchPlaceholder="Filter containers by name..."
            showViewOptions={true}
            pageSize={10}
            emptyMessage="No Docker containers found on this server."
            className="w-full"
          />
        )}
      </CardContent>
    </Card>
  )
}
