package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/goravg/goseeit/internal/collector"
	"github.com/goravg/goseeit/internal/config"
	"github.com/goravg/goseeit/internal/model"
	"github.com/goravg/goseeit/internal/ws"
)

func TestServerEndpoints(t *testing.T) {
	cfg := config.DefaultConfig()
	mgr := collector.NewManager(cfg)
	hub := ws.NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)

	srv := NewServer(cfg, mgr, hub, nil)

	// Test /api/health
	req := httptest.NewRequest("GET", "/api/health", nil)
	rec := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var health map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &health); err != nil {
		t.Fatalf("failed to decode health response: %v", err)
	}
	if health["status"] != "ok" {
		t.Errorf("expected health status 'ok', got %v", health["status"])
	}

	// Test /api/metrics/current
	reqMetrics := httptest.NewRequest("GET", "/api/metrics/current", nil)
	recMetrics := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(recMetrics, reqMetrics)

	if recMetrics.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recMetrics.Code)
	}

	var snapshot model.SystemSnapshot
	if err := json.Unmarshal(recMetrics.Body.Bytes(), &snapshot); err != nil {
		t.Fatalf("failed to decode snapshot response: %v", err)
	}
	if snapshot.Host == nil {
		t.Error("expected non-nil Host info in current metrics")
	}

	// Test static fallback
	reqStatic := httptest.NewRequest("GET", "/", nil)
	recStatic := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(recStatic, reqStatic)

	if recStatic.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recStatic.Code)
	}
}
