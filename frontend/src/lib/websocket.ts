import { db } from './db'
import type { SystemSnapshot } from '@/types/metrics'

export type SnapshotListener = (snapshot: SystemSnapshot) => void
export type StatusListener = (connected: boolean) => void

export class MetricWebSocketClient {
  private ws: WebSocket | null = null
  private reconnectTimeout: any = null
  private listeners: Set<SnapshotListener> = new Set()
  private statusListeners: Set<StatusListener> = new Set()
  private isConnected = false
  private pruneInterval: any = null

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host || 'localhost:8080'
    const url = `${protocol}//${host}/ws`

    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.isConnected = true
        this.notifyStatus(true)
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }
      }

      this.ws.onmessage = async (event) => {
        try {
          const snapshot: SystemSnapshot = JSON.parse(event.data)
          // Broadcast to active React components
          this.notifySnapshot(snapshot)
          // Record to browser IndexedDB
          await db.recordSnapshot(snapshot)
        } catch (e) {
          console.error('[WebSocket] Failed to parse snapshot:', e)
        }
      }

      this.ws.onclose = () => {
        this.isConnected = false
        this.notifyStatus(false)
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.isConnected = false
        this.notifyStatus(false)
        if (this.ws) {
          this.ws.close()
        }
      }
    } catch {
      this.scheduleReconnect()
    }

    // Schedule pruning of records older than 24 hours every 15 minutes
    if (!this.pruneInterval) {
      this.pruneInterval = setInterval(() => {
        db.pruneOldRecords(24).catch(() => {})
      }, 15 * 60 * 1000)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      this.connect()
    }, 2000)
  }

  subscribe(fn: SnapshotListener) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  onStatusChange(fn: StatusListener) {
    this.statusListeners.add(fn)
    fn(this.isConnected)
    return () => {
      this.statusListeners.delete(fn)
    }
  }

  private notifySnapshot(snapshot: SystemSnapshot) {
    this.listeners.forEach((fn) => fn(snapshot))
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((fn) => fn(connected))
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval)
    }
    if (this.ws) {
      this.ws.close()
    }
  }
}

export const wsClient = new MetricWebSocketClient()
