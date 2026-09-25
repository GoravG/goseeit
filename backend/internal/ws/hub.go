package ws

import (
	"context"
	"log"
	"sync/atomic"
)

// Hub coordinates WebSocket client registrations and message fan-out.
// It is 100% lock-free: state is isolated to the single Run event loop goroutine,
// and client count is tracked via atomic integers.
type Hub struct {
	clients     map[*Client]bool
	broadcast   chan []byte
	register    chan *Client
	unregister  chan *Client
	clientCount atomic.Int32
}

// NewHub constructs a new WebSocket Hub.
func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte, 64),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

// ClientCount returns the number of currently connected clients lock-free.
func (h *Hub) ClientCount() int {
	return int(h.clientCount.Load())
}

// Broadcast sends a JSON payload to all connected clients.
func (h *Hub) Broadcast(message []byte) {
	select {
	case h.broadcast <- message:
	default:
		// Drop message if broadcast channel buffer is completely filled
	}
}

// Run executes the hub event loop until the context is canceled.
func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			for client := range h.clients {
				close(client.send)
				delete(h.clients, client)
			}
			h.clientCount.Store(0)
			return

		case client := <-h.register:
			h.clients[client] = true
			h.clientCount.Add(1)
			log.Printf("[WebSocket] Client connected (%s). Total clients: %d", client.remoteAddr, h.ClientCount())

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.clientCount.Add(-1)
				log.Printf("[WebSocket] Client disconnected (%s). Total clients: %d", client.remoteAddr, h.ClientCount())
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					// Slow consumer detected: client's send buffer is full.
					// Disconnect client safely to prevent blocking other consumers.
					log.Printf("[WebSocket] Slow consumer dropped: %s", client.remoteAddr)
					close(client.send)
					delete(h.clients, client)
					h.clientCount.Add(-1)
				}
			}
		}
	}
}
