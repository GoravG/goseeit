<p align="center">
  <img src="assets/icon.png" alt="goseeit icon" width="112" height="112" />
</p>

<h1 align="center">goseeit</h1>

<p align="center">
  <strong>Lightweight, single-binary home server monitor with an embedded real-time web dashboard.</strong>
</p>

<p align="center">
  <a href="https://github.com/goravg/goseeit/actions"><img src="https://img.shields.io/github/actions/workflow/status/goravg/goseeit/release.yaml?style=flat-square&logo=github&label=build" alt="Build Status" /></a>
  <a href="https://github.com/goravg/goseeit/releases"><img src="https://img.shields.io/github/v/release/goravg/goseeit?style=flat-square&color=blue" alt="Latest Release" /></a>
  <a href="https://hub.docker.com/r/goravg/goseeit"><img src="https://img.shields.io/docker/pulls/goravg/goseeit?style=flat-square&logo=docker" alt="Docker Pulls" /></a>
  <img src="https://img.shields.io/badge/container%20size-~14.4%20MB-emerald?style=flat-square" alt="Container Size" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-purple?style=flat-square" alt="License" /></a>
</p>

---

## Overview

**`goseeit`** is a lightweight, single-binary server monitor tailored for home servers (such as an Intel NUC, mini-PC, or home lab) designed to replace heavy Node Exporter + Prometheus + Grafana setups.

Built with **idiomatic Go** and a modern **React + Tailwind + shadcn/ui** frontend embedded directly into the binary (`go:embed`), it streams real-time system metrics over WebSockets and stores historical time-series data locally in the browser's **IndexedDB**, maintaining **zero time-series database (TSDB) footprint on the host server**.

---

## Key Features

- **Ultra-Minimal Scratch Container**: The production Docker image uses `FROM scratch` with pure static Go and embedded React frontend, resulting in an ultra-minimal **~14.4 MB** total container image.
- **Single Executable Deployment**: The web dashboard is embedded directly into the Go binary. Deploying outside Docker is as simple as copying a single `~13 MB` binary to your server.
- **Zero Server Database Overhead**: Historical metrics are persisted and aggregated in browser **IndexedDB (Dexie.js)**, offering 15m, 1h, 6h, and 24h interactive charts with zero server RAM or disk database footprint.
- **Real-Time Streaming**: High-throughput, non-blocking WebSocket Hub streams system snapshots to connected browser clients every 1.5 seconds.
- **Docker Container Inspection**: Connects to the local Docker socket (`/var/run/docker.sock`) to monitor container state, CPU %, RAM, and network I/O.
- **Comprehensive Hardware Metrics**:
  - **CPU**: Total utilization, per-core breakdown, CPU model, and 1m / 5m / 15m load averages.
  - **Memory & Swap**: RAM used, free, and available alongside swap space.
  - **Storage & Disk I/O**: Filesystem usage and real-time read/write throughput (MB/s) and IOPS.
  - **Network Throughput**: Real-time download/upload rates and packet counters per interface.
  - **Intel Integrated GPU**: Linux sysfs DRM monitor (`/sys/class/drm/card0`) reading iGPU clock frequencies and load.

---

## Quick Start

### 1. Run with Docker Compose (Recommended)

Save the following as `docker-compose.yml` or use the provided [`docker-compose.yml`](docker-compose.yml):

```yaml
services:
  goseeit:
    image: goravg/goseeit:latest
    container_name: goseeit
    restart: unless-stopped
    network_mode: host
    pid: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/host/root:ro,rslave
    devices:
      - /dev/dri:/dev/dri
    environment:
      - HOST_PROC=/host/proc
      - HOST_SYS=/host/sys
      - GOSEEIT_SERVER_PORT=3333
      - GOSEEIT_MONITOR_DISKS=/host/root,/dev/sda,/dev/nvme0n1
      - GOSEEIT_MONITOR_INTERFACES=wlo2,eth0,eno1
      - GOSEEIT_DOCKER_ENABLED=true
      - GOSEEIT_INTEL_GPU_ENABLED=true
```

Start the container:
```bash
docker compose up -d
```

Open your browser at `http://<your-server-ip>:3333`.

---

### 2. Run Standalone Binary

Download the latest binary for your architecture from [Releases](https://github.com/goravg/goseeit/releases):

```bash
# Example for Linux AMD64
curl -L -o goseeit https://github.com/goravg/goseeit/releases/latest/download/goseeit_linux_amd64.tar.gz
tar -xzf goseeit_linux_amd64.tar.gz
chmod +x goseeit

# Run with custom port or config
./goseeit -config config.yaml
```

---

### 3. Build from Source

**Prerequisites**: Go 1.25+ and Node.js 20+.

```bash
# Clone repository
git clone https://github.com/goravg/goseeit.git
cd goseeit

# Build frontend and compile standalone binary
make build

# Run goseeit with example config
./backend/bin/goseeit -config backend/config.yaml.example
```

Open your browser at `http://localhost:8080`.

---

## Configuration

You can configure `goseeit` using a YAML configuration file or environment variables.

### Example `config.yaml`

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

### Environment Variable Overrides

All YAML settings can be overridden via environment variables:

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `GOSEEIT_SERVER_HOST` | `0.0.0.0` | Listen IP address |
| `GOSEEIT_SERVER_PORT` | `8080` | Listen HTTP/WebSocket port |
| `GOSEEIT_SERVER_POLL_INTERVAL_MS` | `1500` | Collector scrape frequency in milliseconds |
| `GOSEEIT_MONITOR_DISKS` | `/,/dev/sda` | Comma-separated list of disk mounts / block devices |
| `GOSEEIT_MONITOR_INTERFACES` | (auto-detect) | Comma-separated network interface list |
| `GOSEEIT_DOCKER_ENABLED` | `true` | Enable Docker container inspection |
| `GOSEEIT_DOCKER_SOCKET` | `unix:///var/run/docker.sock` | Docker daemon socket path |
| `GOSEEIT_INTEL_GPU_ENABLED` | `true` | Enable Intel DRM sysfs iGPU reader |
| `GOSEEIT_INTEL_GPU_SYSFS_PATH` | `/sys/class/drm/card0` | Path to Intel DRM sysfs interface |

---

## Architecture & Go Patterns

1. **Concrete Types & Safety**: Every collector returns concrete models (`*model.CPUStats`, `*model.HostInfo`, etc.) rather than empty `any` interfaces, preserving strict compile-time type safety.
2. **Fan-Out / Fan-In Scraping Pipeline**: Concurrently scrapes all metric subsystems using goroutines with strict timeout contexts (`context.WithTimeout`), guaranteeing a slow Docker socket or NFS mount never stalls the ticker.
3. **Lock-Free WebSocket Hub**: Utilizes CSP channel synchronization and `sync/atomic` counters (`atomic.Int32`) to achieve 100% lock-free broadcast distribution with built-in slow consumer disconnect protection.
4. **Immediate Initial Delivery**: Newly connected clients receive cached metric snapshots immediately, eliminating cold-start blank screens.
5. **Graceful Signal Handling**: Intercepts `SIGINT` / `SIGTERM` cleanly, disconnecting active WebSocket clients and draining HTTP connections within a 5-second deadline.

---

## Verification & Testing

Run unit tests under the Go race detector:
```bash
make test
```

Run frontend lint and type-checking:
```bash
cd frontend && npm run build
```

---

## License

This project is licensed under the [MIT License](LICENSE).
