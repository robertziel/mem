### Bash Automation Patterns

**Script template:**
```bash
#!/usr/bin/env bash
set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/var/log/myapp/deploy.log"

# Functions
log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
error() { log "ERROR: $*" >&2; exit 1; }

# Argument parsing
usage() {
  echo "Usage: $0 -e <environment> [-v <version>]"
  exit 1
}

ENVIRONMENT=""
VERSION="latest"

while getopts "e:v:h" opt; do
  case $opt in
    e) ENVIRONMENT="$OPTARG" ;;
    v) VERSION="$OPTARG" ;;
    h) usage ;;
    *) usage ;;
  esac
done

[[ -z "$ENVIRONMENT" ]] && error "Environment is required"

# Main logic
log "Deploying version $VERSION to $ENVIRONMENT"
```

**Checking prerequisites:**
```bash
check_deps() {
  local deps=(docker kubectl aws jq)
  for cmd in "${deps[@]}"; do
    command -v "$cmd" &>/dev/null || error "$cmd is required but not installed"
  done
}
```

**Retry pattern:**
```bash
retry() {
  local max_attempts=$1; shift
  local delay=$1; shift
  local attempt=1

  while (( attempt <= max_attempts )); do
    if "$@"; then
      return 0
    fi
    log "Attempt $attempt/$max_attempts failed. Retrying in ${delay}s..."
    sleep "$delay"
    (( attempt++ ))
  done
  error "Command failed after $max_attempts attempts: $*"
}

retry 5 10 curl -sf https://api.example.com/health
```

**Parallel execution:**
```bash
# Run tasks in parallel, wait for all
pids=()
for host in web1 web2 web3; do
  deploy_to "$host" &
  pids+=($!)
done

# Wait and check results
for pid in "${pids[@]}"; do
  wait "$pid" || error "A deployment failed"
done
```

**Locking (prevent concurrent runs):**
```bash
LOCK_FILE="/tmp/deploy.lock"
exec 200>"$LOCK_FILE"
flock -n 200 || error "Another deployment is already running"
trap 'rm -f "$LOCK_FILE"' EXIT
```

**jq for JSON processing:**
```bash
# Parse AWS/K8s JSON output
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=web" \
  | jq -r '.Reservations[].Instances[].InstanceId')

# Extract from K8s
PODS=$(kubectl get pods -o json | jq -r '.items[].metadata.name')

# Build JSON
jq -n --arg env "$ENVIRONMENT" --arg ver "$VERSION" \
  '{environment: $env, version: $ver}'
```

**Rule of thumb:** Always use `set -euo pipefail`. Add logging, error handling, and usage output. Use `flock` for scripts that shouldn't overlap. Use `jq` for JSON, never `grep`/`sed` on JSON.
