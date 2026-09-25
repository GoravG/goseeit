import React from 'react'
import { Cpu, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { CPUStats, HostInfo } from '@/types/metrics'

interface CpuSectionProps {
  cpu?: CPUStats
  host?: HostInfo
}

export const CpuSection: React.FC<CpuSectionProps> = ({ cpu, host }) => {
  const perCore = cpu?.per_core_percent ?? []
  const modelName = cpu?.model_name || 'Generic x86_64 Processor'
  const load1 = host?.load_avg_1 ?? 0
  const load5 = host?.load_avg_5 ?? 0
  const load15 = host?.load_avg_15 ?? 0

  return (
    <Card className="glass-panel border-white/5">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-white">
                Processor & Logical Cores
              </CardTitle>
              <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">
                {modelName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 font-medium">Load Avg:</span>
            <span className="font-mono text-slate-100 font-semibold">{load1.toFixed(2)}</span>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-slate-300">{load5.toFixed(2)}</span>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-slate-400">{load15.toFixed(2)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {perCore.map((usage, idx) => {
            const isHigh = usage > 85
            const isMed = usage > 60

            return (
              <div
                key={idx}
                className="glass-panel-subtle p-2.5 rounded-lg flex flex-col justify-between hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-mono text-[11px]">Core #{idx}</span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      isHigh ? 'text-rose-400' : isMed ? 'text-amber-400' : 'text-sky-300'
                    }`}
                  >
                    {usage.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={usage}
                  indicatorClassName={
                    isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-400' : 'bg-sky-400'
                  }
                  className="h-1.5 bg-slate-800"
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
