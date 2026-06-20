#!make
# GuitarFlow Studio — project automation
# Run `make` or `make help` to see all available targets.

PYTHON  := $(CURDIR)/backend/.venv/bin/python
BACKEND := backend
FRONTEND := frontend
UV      := uv
NPM     := npm

.PHONY: install install-backend install-frontend \
        dev dev-backend dev-frontend \
        format format-backend format-frontend \
        test test-backend test-frontend \
        build \
        docker docker-down docker-logs \
        clean \
        help

.DEFAULT_GOAL := help

##@ Setup

install: install-backend install-frontend  ## install all dependencies (backend + frontend)

install-backend:  ## install Python dependencies via uv
	cd $(BACKEND) && $(UV) sync

install-frontend:  ## install Node dependencies via npm
	cd $(FRONTEND) && $(NPM) install

##@ Development

dev-backend:  ## start Django dev server (localhost:8000)
	cd $(BACKEND) && $(PYTHON) manage.py runserver

dev-frontend:  ## start Vite dev server (localhost:5173)
	cd $(FRONTEND) && $(NPM) run dev

migrate:  ## run Django database migrations
	cd $(BACKEND) && $(PYTHON) manage.py migrate

makemigrations:  ## create new Django migration files
	cd $(BACKEND) && $(PYTHON) manage.py makemigrations

##@ Format & Lint

format: format-backend format-frontend  ## format all code (backend + frontend)

format-backend:  ## format Python code with ruff
	cd $(BACKEND) && $(UV) run ruff format .

format-frontend:  ## type-check TypeScript with tsc --noEmit
	cd $(FRONTEND) && npx tsc --noEmit

##@ Test

test: test-backend  ## run all tests

test-backend:  ## run Django backend tests
	cd $(BACKEND) && $(PYTHON) manage.py test

##@ Build

build:  ## build frontend production bundle
	cd $(FRONTEND) && $(NPM) run build

##@ Docker

docker:  ## start full stack with Docker Compose (detached)
	docker compose up -d --build

docker-down:  ## stop and remove Docker Compose containers
	docker compose down

docker-logs:  ## tail logs from all Docker Compose services
	docker compose logs -f

##@ Cleanup

clean:  ## remove build artifacts and caches
	rm -rf frontend/dist
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -name "*.pyc" -delete 2>/dev/null || true

##@ Help

help:  ## display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
