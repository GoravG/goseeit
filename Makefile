.PHONY: all build-web sync-web build test clean run

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "v0.1.0")
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "none")
DATE ?= $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')

LDFLAGS = -X main.version=$(VERSION) -X main.commit=$(COMMIT) -X main.date=$(DATE) -s -w

all: build

build-web:
	@echo "==> Building frontend assets..."
	@cd frontend && npm run build

sync-web: build-web
	@echo "==> Syncing web dist into Go embed directory..."
	@mkdir -p backend/internal/server/dist
	@rm -rf backend/internal/server/dist/*
	@cp -r frontend/dist/* backend/internal/server/dist/

build: sync-web
	@echo "==> Compiling standalone single binary..."
	@cd backend && go build -ldflags "$(LDFLAGS)" -o bin/goseeit ./cmd/goseeit
	@echo "==> Successfully created backend/bin/goseeit"

test:
	@echo "==> Running backend unit tests with race detector..."
	@cd backend && go test -v -race ./...

clean:
	@rm -rf backend/bin frontend/dist

run: build
	@echo "==> Running goseeit on http://localhost:8080..."
	@./backend/bin/goseeit -config backend/config.yaml.example
