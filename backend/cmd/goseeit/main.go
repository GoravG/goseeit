package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/goravg/goseeit/internal/collector"
	"github.com/goravg/goseeit/internal/config"
	"github.com/goravg/goseeit/internal/server"
	"github.com/goravg/goseeit/internal/ws"
)

var (
	// Populated at build time via -ldflags
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	configPath := flag.String("config", "config.yaml", "Path to YAML configuration file")
	hostFlag := flag.String("host", "", "Override server host address")
	portFlag := flag.Int("port", 0, "Override server port")
	showVersion := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Printf("goseeit %s (commit: %s, built at: %s)\n", version, commit, date)
		os.Exit(0)
	}

	log.Printf("[Main] Starting goseeit %s...", version)

	// Load configuration
	cfg, err := config.Load(*configPath)
	if err != nil {
		log.Printf("[Main] Warning: Could not load %s, using defaults and environment variables: %v", *configPath, err)
		cfg = config.DefaultConfig()
	}

	// Apply CLI flag overrides if provided
	if *hostFlag != "" {
		cfg.Server.Host = *hostFlag
	}
	if *portFlag > 0 {
		cfg.Server.Port = *portFlag
	}

	// Root context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize subsystems
	mgr := collector.NewManager(cfg)
	hub := ws.NewHub()
	go hub.Run(ctx)

	// Initialize HTTP server with embedded frontend
	srv := server.NewServer(cfg, mgr, hub, server.DistFS())

	// Start server in background goroutine
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- srv.Start(ctx)
	}()

	// Listen for shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	select {
	case sig := <-sigChan:
		log.Printf("[Main] Received signal %v, initiating graceful shutdown...", sig)
	case err := <-serverErr:
		if err != nil {
			log.Fatalf("[Main] Server terminated with error: %v", err)
		}
	}

	// Initiate graceful shutdown with 5-second deadline
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	cancel() // Stops hub and collection loops

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("[Main] Error during server shutdown: %v", err)
	} else {
		log.Printf("[Main] Server stopped cleanly.")
	}
}
