#!/usr/bin/env bash
# Deploy / restart the production stack.
#
# Uses `docker compose up -d --wait` so the script BLOCKS until every
# service reaches its `service_healthy` state — and exits non-zero loudly
# if any service fails to become healthy. No silent failures.
#
# Usage:
#   ./scripts/deploy-prod.sh                # full stack
#   ./scripts/deploy-prod.sh app            # just one service (re-pull + restart)
#   ./scripts/deploy-prod.sh --build        # rebuild images first
#
# Exit codes:
#   0  all services healthy
#   1  one or more services failed to become healthy within the timeout
#   2  invalid usage

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
WAIT_TIMEOUT_SECONDS="${DEPLOY_WAIT_TIMEOUT:-300}"

# Sanity
[ -f "$COMPOSE_FILE" ] || { echo "ERR: $COMPOSE_FILE not found. Run from repo root."; exit 2; }
[ -f "$ENV_FILE" ]     || { echo "ERR: $ENV_FILE not found."; exit 2; }

# Optional --build flag
BUILD_FLAG=()
if [ "${1:-}" = "--build" ]; then
  BUILD_FLAG=(--build)
  shift
fi

SERVICES=("$@")  # empty = all services

echo "==> deploy-prod  (timeout=${WAIT_TIMEOUT_SECONDS}s, services=${SERVICES[*]:-<all>})"

# The --wait flag is the key: compose returns NON-ZERO if any service
# fails to reach service_healthy within --wait-timeout. Without --wait,
# a partial failure (e.g. one container stuck in 'Created') exits zero
# and the deployment looks fine when it isn't.
if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d \
      "${BUILD_FLAG[@]}" \
      --wait \
      --wait-timeout "$WAIT_TIMEOUT_SECONDS" \
      "${SERVICES[@]}"; then
  echo "==> all services healthy"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
  exit 0
else
  EC=$?
  echo "==> ERROR exit=$EC — one or more services did not become healthy in ${WAIT_TIMEOUT_SECONDS}s"
  echo "==> current state:"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
  echo "==> recent logs for unhealthy / not-running containers:"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json 2>/dev/null \
    | jq -r 'select(.Health != "healthy" and .State != "running") | .Service' 2>/dev/null \
    | while read -r svc; do
        [ -n "$svc" ] || continue
        echo "----- $svc -----"
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail 30 "$svc"
      done
  exit "$EC"
fi
