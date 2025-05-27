# Makefile for Infrastructure 3 Project
# Replace 'jd' with your initials

.PHONY: help ssl build up down restart logs clean test

help:
	@echo "Available commands:"
	@echo "  make ssl      - Generate SSL certificates"
	@echo "  make build    - Build all containers"
	@echo "  make up       - Start all services"
	@echo "  make down     - Stop all services"
	@echo "  make restart  - Restart all services"
	@echo "  make logs     - View logs (all services)"
	@echo "  make clean    - Remove containers and volumes"
	@echo "  make test     - Test the application"

ssl:
	@echo "Generating SSL certificates..."
	@chmod +x generate-ssl.sh
	@./generate-ssl.sh

build:
	@echo "Building containers..."
	docker compose build

up:
	@echo "Starting services..."
	docker compose up -d
	@echo "Waiting for services to start..."
	@sleep 5
	@echo "Application available at https://localhost"

down:
	@echo "Stopping services..."
	docker compose down

restart: down up

logs:
	docker compose logs -f

clean:
	@echo "Cleaning up..."
	docker compose down -v
	rm -rf nginx/ssl/

test:
	@echo "Testing API health..."
	@curl -k https://localhost/api/health || echo "API not responding"
	@echo "\nTesting tasks endpoint..."
	@curl -k https://localhost/api/tasks || echo "Tasks endpoint not responding"