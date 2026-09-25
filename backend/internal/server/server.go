package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/goravg/goseeit/internal/collector"
	"github.com/goravg/goseeit/internal/config"
	"github.com/goravg/goseeit/internal/model"
	"github.com/goravg/goseeit/internal/ws"
)

// Server coordinates the HTTP server, WebSocket hub, and metric polling ticker.
type Server struct {
	cfg            *config.Config
	mgr            *collector.Manager
	hub            *ws.Hub
	httpServer     *http.Server
	staticFS       fs.FS
	latestSnapshot      *model.SystemSnapshot
	latestSnapshotBytes []byte
	mu                  sync.RWMutex
}

// NewServer constructs the Server instance.
func NewServer(cfg *config.Config, mgr *collector.Manager, hub *ws.Hub, staticFS fs.FS) *Server {
	s := &Server{
		cfg:      cfg,
		mgr:      mgr,
		hub:      hub,
		staticFS: staticFS,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		s.mu.RLock()
		initialPayload := s.latestSnapshotBytes
		s.mu.RUnlock()
		ws.ServeWS(s.hub, w, r, initialPayload)
	})
	mux.HandleFunc("/api/health", s.handleHealth)
	mux.HandleFunc("/api/metrics/current", s.handleCurrentMetrics)

	// Static asset handler
	mux.HandleFunc("/", s.handleStatic)

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	s.httpServer = &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	return s
}

// Start begins background metric polling and listens for incoming HTTP requests.
func (s *Server) Start(ctx context.Context) error {
	// Start polling loop
	go s.startPolling(ctx)

	log.Printf("[Server] goseeit listening on http://%s:%d", s.cfg.Server.Host, s.cfg.Server.Port)
	if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("http server failure: %w", err)
	}
	return nil
}

// Shutdown gracefully terminates the HTTP server.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}

func (s *Server) startPolling(ctx context.Context) {
	ticker := time.NewTicker(s.cfg.PollDuration())
	defer ticker.Stop()

	// Initial poll on startup
	s.pollAndBroadcast(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.pollAndBroadcast(ctx)
		}
	}
}

func (s *Server) pollAndBroadcast(parentCtx context.Context) {
	// Enforce 1.2s timeout for metrics collection
	timeout := s.cfg.PollDuration() - 200*time.Millisecond
	if timeout <= 0 {
		timeout = 1 * time.Second
	}
	ctx, cancel := context.WithTimeout(parentCtx, timeout)
	defer cancel()

	snapshot := s.mgr.CollectAll(ctx)
	if snapshot == nil {
		return
	}

	data, err := json.Marshal(snapshot)

	s.mu.Lock()
	s.latestSnapshot = snapshot
	if err == nil {
		s.latestSnapshotBytes = data
	}
	s.mu.Unlock()

	// Broadcast if clients are connected and marshaling succeeded
	if s.hub.ClientCount() > 0 && err == nil {
		s.hub.Broadcast(data)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":         "ok",
		"time":           time.Now(),
		"active_clients": s.hub.ClientCount(),
	})
}

func (s *Server) handleCurrentMetrics(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	snap := s.latestSnapshot
	s.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	if snap == nil {
		// If not polled yet, run a single synchronous poll
		snap = s.mgr.CollectAll(r.Context())
	}
	_ = json.NewEncoder(w).Encode(snap)
}

func (s *Server) handleStatic(w http.ResponseWriter, r *http.Request) {
	if s.staticFS == nil {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`<!DOCTYPE html>
<html>
<head><title>goseeit</title><style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:3rem;text-align:center;}</style></head>
<body>
<h1>goseeit server is running</h1>
<p>WebSocket endpoint: <code>/ws</code> | Current Metrics: <a href="/api/metrics/current" style="color:#38bdf8;">/api/metrics/current</a></p>
<p>Frontend will be served here once built.</p>
</body></html>`))
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/")
	if path == "" {
		path = "index.html"
	}

	// Try serving exact file
	f, err := s.staticFS.Open(path)
	if err != nil {
		// Fallback to index.html for SPA routing
		path = "index.html"
		f, err = s.staticFS.Open(path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil || stat.IsDir() {
		http.NotFound(w, r)
		return
	}

	http.FileServer(http.FS(s.staticFS)).ServeHTTP(w, r)
}
