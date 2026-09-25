import { useEffect, useState } from 'react'
import { Server, Wifi, WifiOff, ShieldCheck } from 'lucide-react'
import { wsClient } from '@/lib/websocket'
import { OverviewCards } from '@/components/OverviewCards'
import { VisualGaugesSection } from '@/components/VisualGaugesSection'
import { HistoricalChart } from '@/components/HistoricalChart'
import { CpuSection } from '@/components/CpuSection'
import { DiskAndNetworkSection } from '@/components/DiskAndNetworkSection'
import { DockerSection } from '@/components/DockerSection'
import { Badge } from '@/components/ui/badge'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { SystemSnapshot } from '@/types/metrics'

export function App() {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null)
  const [connected, setConnected] = useState<boolean>(false)

  useEffect(() => {
    // Immediate initial fetch via REST API
    fetch('/api/metrics/current')
      .then((res) => res.json())
      .then((data) => setSnapshot(data))
      .catch(() => {})

    // Establish WebSocket stream
    wsClient.connect()
    const unsubSnap = wsClient.subscribe((data) => {
      setSnapshot(data)
    })
    const unsubStatus = wsClient.onStatusChange((status) => {
      setConnected(status)
    })

    return () => {
      unsubSnap()
      unsubStatus()
      wsClient.disconnect()
    }
  }, [])

  const host = snapshot?.host
  const runningContainers = (snapshot?.containers || []).filter((c) => c.state === 'running').length

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#191919] text-[#ededed] flex flex-col font-sans selection:bg-[#2f5bff]/30 selection:text-[#ededed]">
        {/* Floating pill navigation header matching dashboardcn */}
        <header className="sticky top-0 z-50 h-16 w-full px-4 sm:px-6 pt-3">
          <div className="relative mx-auto flex h-12 w-full max-w-7xl items-center justify-between rounded-full floating-pill-nav px-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-[#2f5bff] flex items-center justify-center text-white shadow-sm shadow-[#2f5bff]/30">
                  <Server className="size-4 stroke-[2.2]" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-base tracking-tight text-white">
                    goseeit
                  </span>
                  <span className="text-[11px] font-mono text-[#969696] font-medium hidden sm:inline">
                    Server Monitor
                  </span>
                </div>
              </div>

              {host && (
                <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-white/10 text-xs text-[#969696]">
                  <span className="font-mono text-[#ededed] font-medium">{host.hostname}</span>
                  <span className="text-[#6d6d6d]">•</span>
                  <span>{host.platform} {host.kernel_version}</span>
                </div>
              )}
            </div>

            {/* Quick status pill badges */}
            <div className="flex items-center gap-2 sm:gap-3">
              {host && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a2a2a] border border-white/10 text-xs font-mono text-[#969696]">
                  <ShieldCheck className="size-3.5 text-[#00bb7f]" />
                  <span>Docker:</span>
                  <span className="text-[#00bb7f] font-semibold">{runningContainers}</span>
                  <span className="text-[#6d6d6d]">running</span>
                </div>
              )}

              <Badge
                variant="outline"
                className={`flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium border transition-colors ${
                  connected
                    ? 'border-[#00bb7f]/30 bg-[#00bb7f]/10 text-[#00bb7f]'
                    : 'border-[#fb2c36]/30 bg-[#fb2c36]/10 text-[#ff6568]'
                }`}
              >
                {connected ? (
                  <>
                    <span className="size-1.5 rounded-full bg-[#00bb7f] animate-live" />
                    <Wifi className="size-3 text-[#00bb7f]" />
                    <span>Live (1.5s)</span>
                  </>
                ) : (
                  <>
                    <span className="size-1.5 rounded-full bg-[#fb2c36]" />
                    <WifiOff className="size-3 text-[#ff6568]" />
                    <span>Connecting...</span>
                  </>
                )}
              </Badge>
            </div>
          </div>
        </header>

        {/* Main Dashboard Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-12 space-y-7">
          {/* Top 5 KPI Cards with Real Sparklines & Deltas */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-1.5 w-5 shrink-0 rounded-full bg-[#2f5bff]" />
              <h2 className="text-sm font-semibold tracking-tight text-[#ededed]">
                Telemetry Pulse
              </h2>
            </div>
            <OverviewCards snapshot={snapshot} />
          </section>

          {/* Radial Gauges & Visual Segmented Thresholds */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-1.5 w-5 shrink-0 rounded-full bg-[#00bb7f]" />
              <h2 className="text-sm font-semibold tracking-tight text-[#ededed]">
                Resource Allocation & Saturation
              </h2>
            </div>
            <VisualGaugesSection snapshot={snapshot} />
          </section>

          {/* Historical Interactive Trend Chart (IndexedDB) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-1.5 w-5 shrink-0 rounded-full bg-[#f99c00]" />
              <h2 className="text-sm font-semibold tracking-tight text-[#ededed]">
                Historical Time-Series
              </h2>
            </div>
            <HistoricalChart />
          </section>

          {/* CPU Hardware & Per-Core Breakdown */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-1.5 w-5 shrink-0 rounded-full bg-[#2f5bff]" />
              <h2 className="text-sm font-semibold tracking-tight text-[#ededed]">
                Logical Processors
              </h2>
            </div>
            <CpuSection cpu={snapshot?.cpu} host={snapshot?.host} />
          </section>

          {/* Storage Mounts & Network Adapters */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-1.5 w-5 shrink-0 rounded-full bg-[#ac4bff]" />
              <h2 className="text-sm font-semibold tracking-tight text-[#ededed]">
                Storage & Network Interfaces
              </h2>
            </div>
            <DiskAndNetworkSection disks={snapshot?.disks} networks={snapshot?.networks} />
          </section>

          {/* Docker Containers Command Table (TanStack DataTable) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="h-1.5 w-5 shrink-0 rounded-full bg-[#2f5bff]" />
              <h2 className="text-sm font-semibold tracking-tight text-[#ededed]">
                Docker Services
              </h2>
            </div>
            <DockerSection containers={snapshot?.containers} dockerError={snapshot?.docker_error} />
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-6 text-center text-xs text-[#969696] max-w-7xl mx-auto px-4 sm:px-6 w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#2f5bff]" />
            <span className="font-semibold text-[#ededed]">goseeit</span>
            <span className="text-[#6d6d6d]">—</span>
            <span>Single-Binary Home Server Monitor</span>
          </div>
          <div className="text-[#6d6d6d] flex items-center gap-1">
            Styled with <span className="text-[#ededed] font-medium">dashboardcn</span> components & design system
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}

export default App
