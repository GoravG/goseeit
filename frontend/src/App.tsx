import { useEffect, useState } from 'react'
import { Server, Wifi, WifiOff } from 'lucide-react'
import { wsClient } from '@/lib/websocket'
import { OverviewCards } from '@/components/OverviewCards'
import { CpuSection } from '@/components/CpuSection'
import { DiskAndNetworkSection } from '@/components/DiskAndNetworkSection'
import { DockerSection } from '@/components/DockerSection'
import { HistoricalChart } from '@/components/HistoricalChart'
import { Badge } from '@/components/ui/badge'
import type { SystemSnapshot } from '@/types/metrics'

export function App() {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null)
  const [connected, setConnected] = useState<boolean>(false)

  useEffect(() => {
    // Initial fetch from REST API for instantaneous load
    fetch('/api/metrics/current')
      .then((res) => res.json())
      .then((data) => setSnapshot(data))
      .catch(() => {})

    // Connect WebSocket
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

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-500/20">
              <Server className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              goseeit
            </span>
          </div>

          {host && (
            <div className="hidden sm:flex items-center gap-2 ml-3 pl-3 border-l border-slate-800 text-xs text-slate-400">
              <span className="font-mono text-slate-200 font-medium">{host.hostname}</span>
              <span className="text-slate-600">•</span>
              <span>{host.platform} {host.kernel_version}</span>
            </div>
          )}
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3">
          <Badge
            variant={connected ? 'success' : 'destructive'}
            className="flex items-center gap-1.5 py-1 px-3 shadow-sm"
          >
            {connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live" />
                <Wifi className="w-3.5 h-3.5" />
                <span>Live Stream</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <WifiOff className="w-3.5 h-3.5" />
                <span>Reconnecting...</span>
              </>
            )}
          </Badge>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top 5 overview gauge cards */}
        <OverviewCards snapshot={snapshot} />

        {/* Client-side IndexedDB Historical Trend Chart */}
        <HistoricalChart />

        {/* CPU & Per-Core breakdown */}
        <CpuSection cpu={snapshot?.cpu} host={snapshot?.host} />

        {/* Disks Space & I/O + Network Interfaces */}
        <DiskAndNetworkSection disks={snapshot?.disks} networks={snapshot?.networks} />

        {/* Docker Container Monitoring */}
        <DockerSection containers={snapshot?.containers} dockerError={snapshot?.docker_error} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        goseeit • Single-binary Intel NUC Server Monitor • Go + React + IndexedDB
      </footer>
    </div>
  )
}

export default App
