import React from 'react'
import { Box, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { formatBytes } from '@/lib/utils'
import type { ContainerMetric } from '@/types/metrics'

interface DockerSectionProps {
  containers?: ContainerMetric[]
  dockerError?: string
}

export const DockerSection: React.FC<DockerSectionProps> = ({ containers = [], dockerError }) => {
  const runningCount = containers.filter((c) => c.state === 'running').length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-sky-400" />
            <CardTitle>Docker Containers</CardTitle>
            <Badge variant="outline" className="ml-2 font-mono">
              {runningCount} / {containers.length} Running
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {dockerError ? (
          <div className="flex items-center gap-2 p-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Docker daemon: {dockerError}</span>
          </div>
        ) : containers.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">No containers found on host</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-700/60 pb-2">
                <tr>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Image</th>
                  <th className="py-2.5 px-3">CPU %</th>
                  <th className="py-2.5 px-3">Memory Usage</th>
                  <th className="py-2.5 px-3">Network I/O</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {containers.map((c) => {
                  const isRunning = c.state === 'running'
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-sans font-medium text-slate-200">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.id}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={isRunning ? 'success' : c.state === 'paused' ? 'warning' : 'destructive'}>
                          {c.state}
                        </Badge>
                        <div className="text-[10px] text-slate-400 mt-1 font-sans truncate max-w-[130px]">
                          {c.status}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-sans text-xs max-w-[180px] truncate" title={c.image}>
                        {c.image}
                      </td>
                      <td className="py-3 px-3">
                        {isRunning ? (
                          <div className="w-24 space-y-1">
                            <span className="text-slate-200 font-semibold">{c.cpu_percent.toFixed(1)}%</span>
                            <Progress
                              value={c.cpu_percent}
                              indicatorClassName={c.cpu_percent > 80 ? 'bg-rose-500' : 'bg-sky-400'}
                              className="h-1.5"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isRunning && c.memory_limit_bytes > 0 ? (
                          <div className="w-32 space-y-1">
                            <div className="text-[11px] text-slate-300">
                              {formatBytes(c.memory_used_bytes)} ({c.memory_percent.toFixed(1)}%)
                            </div>
                            <Progress
                              value={c.memory_percent}
                              indicatorClassName={c.memory_percent > 85 ? 'bg-rose-500' : 'bg-emerald-400'}
                              className="h-1.5"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        {isRunning ? (
                          <div>
                            <span className="text-emerald-400">↓ {formatBytes(c.net_rx_bytes)}</span>{' '}
                            <span className="text-sky-400">↑ {formatBytes(c.net_tx_bytes)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
