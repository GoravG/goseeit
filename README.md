# goseeit — Lightweight Single-Binary Home Server Monitor

`goseeit` is a lightweight, single-binary server monitor tailored for home servers (such as an Intel NUC) to replace heavy Node Exporter + Prometheus + Grafana setups.

Built with **idiomatic Go** and a modern **React + Tailwind + shadcn/ui** frontend embedded directly into the binary (`go:embed`), it streams real-time system metrics over WebSockets and stores historical time-series data locally in the browser's **IndexedDB**, maintaining zero TSDB footprint on the server.

---

## Features

- **Ultra-Minimal Scratch Container**: The production Docker image uses `FROM scratch` with pure static Go and embedded React frontend, resulting in an ultra-minimal **~14.4 MB** total container image.
- **Single Executable Deployment**: The web dashboard is embedded directly into the Go binary. Deploying outside Docker is as simple as copying a single `~13 MB` binary to your server.
- **Real-Time Streaming**: High-throughput, non-blocking WebSocket Hub streams system snapshots to connected browser clients every 1.5 seconds.
- **Client-Side Historical Metrics (IndexedDB)**: Historical metrics are persisted and aggregated in browser IndexedDB (Dexie.js), offering 15m, 1h, 6h, and 24h interactive charts with zero server memory/disk database overhead.
- **Docker Container Inspection**: Connects to the local Docker socket (`/var/run/docker.sock`) to monitor container state, CPU %, RAM, and network I/O.
- **Comprehensive Hardware Metrics**:
  - **CPU**: Total utilization, per-core percentages, CPU model, and system load averages (1m, 5m, 15m).
  - **Memory & Swap**: RAM used/free/available and Swap utilization.
  - **Storage & Disk I/O**: Filesystem usage and real-time read/write throughput (MB/s) and IOPS.
  - **Network Throughput**: Real-time download/upload rates and packet counters.
  - **Intel Integrated GPU**: Linux sysfs DRM monitor (`/sys/class/drm/card0`) reading iGPU clock frequencies and load.

---

## Architecture & Go Patterns

1. **Concrete Types & Compiler Safety**: Every metric collector returns concrete models (`*model.CPUStats`, `*model.HostInfo`, etc.) rather than empty `any` interfaces, preserving full compile-time type safety.
2. **Fan-Out / Fan-In Scraping Pipeline**: Concurrently scrapes all metric subsystems using goroutines with strict timeout contexts (`context.WithTimeout`), guaranteeing a slow Docker socket or NFS mount never stalls the ticker.
3. **Lock-Free WebSocket Hub**: Utilizes CSP channel synchronization and `sync/atomic` counters (`atomic.Int32`) to achieve 100% lock-free message broadcasting with built-in slow consumer disconnect protection.
4. **Immediate Initial Delivery**: Newly connected WebSocket clients receive cached metric snapshots immediately, eliminating cold-start blank screens.
5. **Clean Signal Handling**: Handles `SIGINT` / `SIGTERM` gracefully, draining active WebSocket clients and shutting down the HTTP server within a 5-second deadline.

---

## Quick Start

### 1. Build and Run from Source

```bash
# Clone the repository
git clone https://github.com/goravg/goseeit.git
cd goseeit

# Build frontend and compile standalone binary
make build

# Run goseeit with default or example config
./backend/bin/goseeit -config backend/config.yaml.example
```

Open your browser at `http://localhost:8080`.

### 2. Configuration (`config.yaml` or Environment Variables)

```yaml
server:
  host: "0.0.0.0"
  port: 8080
  poll_interval_ms: 1500

monitor:
  disks:
    - "/"
    - "/dev/sda"
    - "/dev/nvme0n1"
  interfaces:
    - "wlo2"
    - "eth0"
  intel_gpu:
    enabled: true
    sysfs_path: "/sys/class/drm/card0"
  docker:
    enabled: true
    socket_path: "unix:///var/run/docker.sock"
```

All options can be overridden using environment variables:
```bash
export GOSEEIT_SERVER_PORT=8080
export GOSEEIT_MONITOR_INTERFACES="wlo2,eth0"
export GOSEEIT_MONITOR_DISKS="/,/dev/sda"
export GOSEEIT_DOCKER_ENABLED="true"
./backend/bin/goseeit
```

---

## Verification & Testing

Run all unit tests under the Go race detector:
```bash
make test
```

---

## License

MIT
