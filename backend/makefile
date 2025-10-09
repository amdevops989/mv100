# Makefile at the root of backend

# Default image tag
TAG = latest

# Build a service: make build SERVICE=auth
build:
	@if [ -z "$(SERVICE)" ]; then \
		echo "Please specify SERVICE=<service_name>"; \
		exit 1; \
	fi
	@echo "Building Docker image for service: $(SERVICE)"
	@docker build -t $(SERVICE):$(TAG) ./$(SERVICE)

# Build all services
ALL_SERVICES = auth cart catalog orders payments notification

build-all:
	@for service in $(ALL_SERVICES); do \
		echo "Building $$service..."; \
		docker build -t $$service:$(TAG) ./$$service; \
	done
