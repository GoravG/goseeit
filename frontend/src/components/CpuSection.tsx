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
    <Card className="glass-panel border-white/10">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2f5bff]/10 border border-[#2f5bff]/20 text-[#2f5bff]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-[#ededed]">
                Processor & Logical Cores
              </CardTitle>
              <div className="text-xs text-[#969696] truncate max-w-md mt-0.5">
                {modelName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs bg-[#1c1c1e] px-3 py-1.5 rounded-lg border border-white/10">
            <Activity className="w-3.5 h-3.5 text-[#2f5bff]" />
            <span className="text-[#969696] font-medium">Load Avg:</span>
            <span className="font-mono text-[#ededed] font-semibold">{load1.toFixed(2)}</span>
            <span className="text-[#4e4e4e]">/</span>
            <span className="font-mono text-[#c2c2c2]">{load5.toFixed(2)}</span>
            <span className="text-[#4e4e4e]">/</span>
            <span className="font-mono text-[#969696]">{load15.toFixed(2)}</span>
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
                className="bg-[#1c1c1e] border border-white/5 p-2.5 rounded-lg flex flex-col justify-between hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#969696] font-mono text-[11px]">Core #{idx}</span>
                  <span
                    className={`font-mono text-xs font-semibold ${
                      isHigh ? 'text-[#ff6568]' : isMed ? 'text-[#f99c00]' : 'text-[#2f5bff]'
                    }`}
                  >
                    {usage.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={usage}
                  indicatorClassName={
                    isHigh ? 'bg-[#fb2c36]' : isMed ? 'bg-[#f99c00]' : 'bg-[#2f5bff]'
                  }
                  className="h-1.5 bg-[#2a2a2a]"
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
