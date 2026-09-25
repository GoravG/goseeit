package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDefaultConfig(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.Server.Port != 8080 {
		t.Fatalf("expected default port 8080, got %d", cfg.Server.Port)
	}
	if cfg.Server.Host != "0.0.0.0" {
		t.Fatalf("expected host 0.0.0.0, got %s", cfg.Server.Host)
	}
	if cfg.PollDuration() != 1500*time.Millisecond {
		t.Fatalf("expected poll duration 1.5s, got %v", cfg.PollDuration())
	}
}

func TestLoadWithYAMLAndEnvOverrides(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.yaml")

	yamlContent := `
server:
  host: "127.0.0.1"
  port: 9000
  poll_interval_ms: 2000
monitor:
  disks:
    - "/dev/sda"
  interfaces:
    - "eth0"
  intel_gpu:
    enabled: true
    sysfs_path: "/sys/class/drm/card0"
  docker:
    enabled: true
    socket_path: "unix:///var/run/docker.sock"
`
	if err := os.WriteFile(configPath, []byte(yamlContent), 0644); err != nil {
		t.Fatalf("failed to write test yaml: %v", err)
	}

	// Set environment override
	t.Setenv("GOSEEIT_SERVER_PORT", "9999")
	t.Setenv("GOSEEIT_MONITOR_INTERFACES", "wlo2, eth1")
	t.Setenv("GOSEEIT_DOCKER_ENABLED", "false")

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}

	if cfg.Server.Host != "127.0.0.1" {
		t.Errorf("expected host 127.0.0.1 from yaml, got %s", cfg.Server.Host)
	}
	if cfg.Server.Port != 9999 {
		t.Errorf("expected port 9999 overridden by env, got %d", cfg.Server.Port)
	}
	if len(cfg.Monitor.Interfaces) != 2 || cfg.Monitor.Interfaces[0] != "wlo2" || cfg.Monitor.Interfaces[1] != "eth1" {
		t.Errorf("expected interfaces [wlo2, eth1], got %v", cfg.Monitor.Interfaces)
	}
	if cfg.Monitor.Docker.Enabled != false {
		t.Errorf("expected docker enabled false from env override, got true")
	}
}
