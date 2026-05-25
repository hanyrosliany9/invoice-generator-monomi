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
DO_BUILD=0
if [ "${1:-}" = "--build" ]; then
  DO_BUILD=1
  shift
fi

SERVICES=("$@")  # empty = all services

DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

echo "==> deploy-prod  (timeout=${WAIT_TIMEOUT_SECONDS}s, build=${DO_BUILD}, services=${SERVICES[*]:-<all>})"

# Step 1 (optional): build images SEPARATELY from the up step.
#
# Why split it: when `--build` is combined with `up -d --wait` in a single
# command, compose v2.x has a known race where a freshly-built image can
# leave its container in 'Created' state while still reporting exit 0
# (the wait phase appears to be skipped for containers that compose
# considers "just made"). Building first, then upping with --wait, makes
# the lifecycle deterministic.
if [ "$DO_BUILD" -eq 1 ]; then
  echo "==> building images..."
  "${DC[@]}" build "${SERVICES[@]}"
fi

# Step 2: start + wait for health. The --wait flag returns NON-ZERO if any
# service fails to reach service_healthy within --wait-timeout. Without
# --wait, a partial failure (e.g. one container stuck in 'Created') exits
# zero and the deployment looks fine when it isn't.
#
# --force-recreate ensures freshly-built images actually replace running
# containers — without it, an unchanged tag can leave the OLD container
# running.
RECREATE_FLAG=()
[ "$DO_BUILD" -eq 1 ] && RECREATE_FLAG=(--force-recreate)

if "${DC[@]}" up -d \
      "${RECREATE_FLAG[@]}" \
      --wait \
      --wait-timeout "$WAIT_TIMEOUT_SECONDS" \
      "${SERVICES[@]}"; then
  UP_OK=1
else
  UP_OK=0
  UP_EC=$?
fi

# Step 3: PARANOIA CHECK — don't trust compose's exit code alone.
# Walk every defined service and confirm its container is actually
# 'running'. A container in 'created', 'exited', 'restarting', or
# 'dead' state means the deploy did NOT succeed even if compose said 0.
echo "==> verifying container states..."
BAD_SERVICES=()
mapfile -t ALL_SERVICES < <("${DC[@]}" config --services)
for svc in "${ALL_SERVICES[@]}"; do
  state=$("${DC[@]}" ps --status created --status exited --status restarting --status dead --status paused "$svc" --format '{{.Service}}' 2>/dev/null || true)
  if [ -n "$state" ]; then
    BAD_SERVICES+=("$svc")
  fi
done

if [ "$UP_OK" -eq 1 ] && [ ${#BAD_SERVICES[@]} -eq 0 ]; then
  echo "==> all services healthy and running"
  "${DC[@]}" ps
  exit 0
fi

# Failure path: report state + tail logs for whatever's wrong.
if [ "$UP_OK" -eq 0 ]; then
  echo "==> ERROR exit=$UP_EC — compose up failed (services did not become healthy in ${WAIT_TIMEOUT_SECONDS}s)"
fi
if [ ${#BAD_SERVICES[@]} -gt 0 ]; then
  echo "==> ERROR — paranoia check found containers not in 'running' state: ${BAD_SERVICES[*]}"
fi
echo "==> current state:"
"${DC[@]}" ps -a
echo "==> recent logs for problem containers:"
for svc in "${BAD_SERVICES[@]}"; do
  echo "----- $svc -----"
  "${DC[@]}" logs --tail 30 "$svc" 2>&1 || true
done
exit 1
