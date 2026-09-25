package ws

import (
	"context"
	"testing"
	"time"
)

func TestHubLifecycleAndBroadcast(t *testing.T) {
	hub := NewHub()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go hub.Run(ctx)

	client := &Client{
		hub:        hub,
		send:       make(chan []byte, 10),
		remoteAddr: "127.0.0.1:50000",
	}

	// Register client
	hub.register <- client

	// Wait for registration
	time.Sleep(20 * time.Millisecond)
	if count := hub.ClientCount(); count != 1 {
		t.Fatalf("expected 1 client, got %d", count)
	}

	// Broadcast message
	msg := []byte(`{"status":"ok"}`)
	hub.Broadcast(msg)

	select {
	case received := <-client.send:
		if string(received) != string(msg) {
			t.Fatalf("expected message %s, got %s", msg, received)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for broadcast message")
	}

	// Unregister client
	hub.unregister <- client
	time.Sleep(20 * time.Millisecond)
	if count := hub.ClientCount(); count != 0 {
		t.Fatalf("expected 0 clients, got %d", count)
	}
}
