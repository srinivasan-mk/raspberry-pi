BINARY_NAME=pi-daemon
BUILD_DIR=bin

.PHONY: all build build-arm64 clean test run

all: build

build:
	@echo "Building local binary..."
	go build -ldflags="-s -w" -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/daemon

# Cross-compile for Raspberry Pi 4B (Raspbian Lite 64-bit)
build-arm64:
	@echo "Cross-compiling for Linux ARM64 (Raspberry Pi 4B)..."
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BUILD_DIR)/$(BINARY_NAME)-arm64 ./cmd/daemon
	@echo "Done! Binary generated at $(BUILD_DIR)/$(BINARY_NAME)-arm64"

# Cross-compile for Raspberry Pi 32-bit (ARMv7) if using 32-bit Raspbian
build-armv7:
	@echo "Cross-compiling for Linux ARMv7 (Raspberry Pi 32-bit)..."
	GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BUILD_DIR)/$(BINARY_NAME)-armv7 ./cmd/daemon

test:
	go test -v ./...

clean:
	rm -rf $(BUILD_DIR)

run:
	go run ./cmd/daemon -config config.yaml
