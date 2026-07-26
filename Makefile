# Raccourcis de développement. `make` seul affiche l'aide.

PNPM     ?= pnpm
PHP      ?= php
# Cible du proxy /api.php de Vite (cf. vite.config.js).
PHP_HOST ?= localhost:8000

.DEFAULT_GOAL := help
.PHONY: help install run build lint

help: ## Affiche cette aide
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-8s\033[0m %s\n", $$1, $$2}'

# Réinstalle dès que le manifeste ou le lock bouge.
node_modules: package.json pnpm-lock.yaml
	$(PNPM) install
	@touch node_modules

install: node_modules ## Installe les dépendances

run: node_modules ## Lance Vite et le serveur PHP de l'API (Ctrl-C arrête les deux)
	@echo "API PHP : http://$(PHP_HOST)"
	@$(PHP) -S $(PHP_HOST) -t public & \
	php_pid=$$!; \
	trap 'kill $$php_pid 2>/dev/null' EXIT INT TERM; \
	$(PNPM) dev

build: node_modules ## Build de production dans dist/
	NODE_ENV=production $(PNPM) build

lint: node_modules ## Vérifie le style du code de src/
	$(PNPM) lint
