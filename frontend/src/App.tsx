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
      <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-500/20">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                  goseeit
                </span>
                <span className="ml-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
                  Command Center
                </span>
              </div>
            </div>

            {host && (
              <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-xs text-slate-400">
                <span className="font-mono text-slate-200 font-medium">{host.hostname}</span>
                <span className="text-slate-600">•</span>
                <span>
                  {host.platform} {host.kernel_version}
                </span>
              </div>
            )}
          </div>

          {/* Quick status badges */}
          <div className="flex items-center gap-2.5">
            {host && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Docker:</span>
                <span className="text-emerald-400 font-bold">{runningContainers}</span>
                <span className="text-slate-500">running</span>
              </div>
            )}

            <Badge
              variant={connected ? 'default' : 'destructive'}
              className={`flex items-center gap-1.5 py-1 px-3 shadow-sm text-xs font-medium border ${
                connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              {connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" />
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Streaming (1.5s)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Connecting...</span>
                </>
              )}
            </Badge>
          </div>
        </header>

        {/* Main Dashboard Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Top 5 KPI Cards with Real Sparklines & Deltas */}
          <OverviewCards snapshot={snapshot} />

          {/* Radial Gauges & Visual Segmented Thresholds */}
          <VisualGaugesSection snapshot={snapshot} />

          {/* Historical Interactive Trend Chart (IndexedDB) */}
          <HistoricalChart />

          {/* CPU Hardware & Per-Core Breakdown */}
          <CpuSection cpu={snapshot?.cpu} host={snapshot?.host} />

          {/* Storage Mounts & Network Adapters */}
          <DiskAndNetworkSection disks={snapshot?.disks} networks={snapshot?.networks} />

          {/* Docker Containers Command Table (TanStack DataTable) */}
          <DockerSection containers={snapshot?.containers} dockerError={snapshot?.docker_error} />
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-5 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto px-4 w-full gap-2">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400">goseeit</span>
            <span>•</span>
            <span>Single-Binary Home Server Monitor</span>
          </div>
          <div className="text-slate-500">
            Powered by Go + React + dashboardcn + TanStack Table + Dexie.js
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}

export default App
