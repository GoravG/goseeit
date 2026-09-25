package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Config holds the application runtime configuration.
type Config struct {
	Server  ServerConfig  `yaml:"server"`
	Monitor MonitorConfig `yaml:"monitor"`
}

// ServerConfig specifies HTTP & WebSocket server options.
type ServerConfig struct {
	Host           string `yaml:"host"`
	Port           int    `yaml:"port"`
	PollIntervalMs int    `yaml:"poll_interval_ms"`
}

// MonitorConfig specifies what devices and subsystems to track.
type MonitorConfig struct {
	Disks      []string    `yaml:"disks"`
	Interfaces []string    `yaml:"interfaces"`
	IntelGPU   GPUConfig   `yaml:"intel_gpu"`
	Docker     DockerConfig `yaml:"docker"`
}

// GPUConfig controls GPU polling.
type GPUConfig struct {
	Enabled   bool   `yaml:"enabled"`
	SysfsPath string `yaml:"sysfs_path"`
}

// DockerConfig controls Docker container inspection.
type DockerConfig struct {
	Enabled    bool   `yaml:"enabled"`
	SocketPath string `yaml:"socket_path"`
}

// DefaultConfig returns safe fallback default values.
func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Host:           "0.0.0.0",
			Port:           8080,
			PollIntervalMs: 1500,
		},
		Monitor: MonitorConfig{
			Disks:      []string{"/", "/dev/sda", "/dev/nvme0n1"},
			Interfaces: []string{}, // empty = auto-detect all active non-loopback
			IntelGPU: GPUConfig{
				Enabled:   true,
				SysfsPath: "/sys/class/drm/card0",
			},
			Docker: DockerConfig{
				Enabled:    true,
				SocketPath: "unix:///var/run/docker.sock",
			},
		},
	}
}

// PollDuration returns the configured poll interval as a time.Duration.
func (c *Config) PollDuration() time.Duration {
	ms := c.Server.PollIntervalMs
	if ms <= 0 {
		ms = 1500
	}
	return time.Duration(ms) * time.Millisecond
}

// Load loads configuration from an optional file path and applies environment variable overrides.
func Load(path string) (*Config, error) {
	cfg := DefaultConfig()

	if path != "" {
		data, err := os.ReadFile(path)
		if err != nil && !os.IsNotExist(err) {
			return nil, fmt.Errorf("failed to read config file %q: %w", path, err)
		}
		if err == nil {
			if err := yaml.Unmarshal(data, cfg); err != nil {
				return nil, fmt.Errorf("failed to parse config file %q: %w", path, err)
			}
		}
	}

	applyEnvOverrides(cfg)
	return cfg, nil
}

func applyEnvOverrides(cfg *Config) {
	if host := os.Getenv("GOSEEIT_SERVER_HOST"); host != "" {
		cfg.Server.Host = host
	}
	if portStr := os.Getenv("GOSEEIT_SERVER_PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil && p > 0 {
			cfg.Server.Port = p
		}
	}
	if pollStr := os.Getenv("GOSEEIT_POLL_INTERVAL_MS"); pollStr != "" {
		if interval, err := strconv.Atoi(pollStr); err == nil && interval >= 500 {
			cfg.Server.PollIntervalMs = interval
		}
	}
	if disksStr := os.Getenv("GOSEEIT_MONITOR_DISKS"); disksStr != "" {
		cfg.Monitor.Disks = splitAndTrim(disksStr)
	}
	if ifacesStr := os.Getenv("GOSEEIT_MONITOR_INTERFACES"); ifacesStr != "" {
		cfg.Monitor.Interfaces = splitAndTrim(ifacesStr)
	}
	if dockerEnabled := os.Getenv("GOSEEIT_DOCKER_ENABLED"); dockerEnabled != "" {
		cfg.Monitor.Docker.Enabled = parseBool(dockerEnabled, cfg.Monitor.Docker.Enabled)
	}
	if dockerSocket := os.Getenv("GOSEEIT_DOCKER_SOCKET"); dockerSocket != "" {
		cfg.Monitor.Docker.SocketPath = dockerSocket
	}
	if gpuEnabled := os.Getenv("GOSEEIT_INTEL_GPU_ENABLED"); gpuEnabled != "" {
		cfg.Monitor.IntelGPU.Enabled = parseBool(gpuEnabled, cfg.Monitor.IntelGPU.Enabled)
	}
	if gpuSysfs := os.Getenv("GOSEEIT_INTEL_GPU_SYSFS"); gpuSysfs != "" {
		cfg.Monitor.IntelGPU.SysfsPath = gpuSysfs
	}
}

func splitAndTrim(s string) []string {
	parts := strings.Split(s, ",")
	res := make([]string, 0, len(parts))
	for _, p := range parts {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			res = append(res, trimmed)
		}
	}
	return res
}

func parseBool(s string, fallback bool) bool {
	v, err := strconv.ParseBool(strings.ToLower(strings.TrimSpace(s)))
	if err != nil {
		return fallback
	}
	return v
}
