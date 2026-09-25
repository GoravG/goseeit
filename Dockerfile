# -------------------------------------------------------------
# Stage 1: Build the React + Tailwind + shadcn/ui frontend
# -------------------------------------------------------------
FROM node:22-alpine AS web-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Build the static, zero-dependency Go single binary
# -------------------------------------------------------------
FROM golang:alpine AS go-builder

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Pre-cache Go dependencies
COPY backend/go.mod backend/go.sum ./backend/
WORKDIR /app/backend
RUN go mod download

# Copy backend source and embed frontend distribution files
COPY backend/ ./
COPY --from=web-builder /app/frontend/dist/ ./internal/server/dist/

# Compile completely static, stripped Linux binary
ARG VERSION=v0.1.0
ARG COMMIT=docker
ARG DATE=unknown
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT} -X main.date=${DATE} -extldflags '-static'" \
    -o /goseeit ./cmd/goseeit

# -------------------------------------------------------------
# Stage 3: Zero-overhead production runtime image (~14MB total)
# -------------------------------------------------------------
FROM scratch

# Copy CA certificates and timezone database from builder
COPY --from=go-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=go-builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy binary and example configuration
COPY --from=go-builder /goseeit /goseeit
COPY backend/config.yaml.example /config.yaml

EXPOSE 8080

# Environment defaults for containerized host monitoring
ENV HOST_PROC=/host/proc \
    HOST_SYS=/host/sys \
    GOSEEIT_SERVER_PORT=8080 \
    GOSEEIT_SERVER_HOST=0.0.0.0

ENTRYPOINT ["/goseeit"]
CMD ["-config", "/config.yaml"]
