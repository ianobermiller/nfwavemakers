.PHONY: build linux-arm64 tidy test

build:
	CGO_ENABLED=0 go build -o pocketbase .

linux-arm64:
	mkdir -p dist
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o dist/pocketbase-linux-arm64 .

tidy:
	go mod tidy

test:
	go test ./...
