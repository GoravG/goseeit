package server

import (
	"embed"
	"io/fs"
	"log"
)

//go:embed all:dist
var embeddedDist embed.FS

// DistFS returns the embedded filesystem rooted at the dist directory.
func DistFS() fs.FS {
	sub, err := fs.Sub(embeddedDist, "dist")
	if err != nil {
		log.Printf("[Server] Warning: failed to sub-mount embedded dist: %v", err)
		return embeddedDist
	}
	return sub
}
