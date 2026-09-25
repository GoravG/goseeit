import React from 'react'
import { Cpu, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Progress } from './ui/progress'
import type { CPUStats, HostInfo } from '@/types/metrics'

interface CpuSectionProps {
  cpu?: CPUStats
  host?: HostInfo
}

export const CpuSection: React.FC<CpuSectionProps> = ({ cpu, host }) => {
  const perCore = cpu?.per_core_percent ?? []
  const modelName = cpu?.model_name || 'Generic CPU'
  const load1 = host?.load_avg_1 ?? 0
  const load5 = host?.load_avg_5 ?? 0
  const load15 = host?.load_avg_15 ?? 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-400" />
            <div>
              <CardTitle>Processor & Cores</CardTitle>
              <div className="text-xs text-slate-400 truncate max-w-md">{modelName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Load Avg:</span>
            <span className="font-mono text-slate-200">{load1.toFixed(2)}</span>
            <span className="font-mono text-slate-400">{load5.toFixed(2)}</span>
            <span className="font-mono text-slate-500">{load15.toFixed(2)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {perCore.map((usage, idx) => (
            <div key={idx} className="glass-panel-subtle p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 font-mono">Core {idx}</span>
                <span
                  className={`font-semibold font-mono ${
                    usage > 85 ? 'text-rose-400' : usage > 65 ? 'text-amber-400' : 'text-sky-300'
                  }`}
                >
                  {usage.toFixed(0)}%
                </span>
              </div>
              <Progress
                value={usage}
                indicatorClassName={usage > 85 ? 'bg-rose-500' : usage > 65 ? 'bg-amber-500' : 'bg-sky-400'}
                className="h-1.5"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
