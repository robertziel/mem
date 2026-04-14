### Docker Resource Limits and Health Checks

**Resource limits:**
```bash
# CLI
docker run --memory=512m --cpus=1.5 myapp
docker run --memory=512m --memory-swap=1g myapp   # memory + swap
docker run --pids-limit=100 myapp                  # prevent fork bombs

# Compose
services:
  web:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.5"
        reservations:
          memory: 256M
          cpus: "0.5"
```

**What happens when limits are hit:**
- Memory limit exceeded: container is OOM-killed (exit code 137)
- CPU limit: container is throttled (not killed)
- No limits set: container can consume all host resources

**Health checks:**
```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:3000/health || exit 1
```

```yaml
# Compose
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

**Health check states:**
- `starting` - within start_period, failures don't count
- `healthy` - check passing
- `unhealthy` - consecutive failures >= retries

**Health check best practices:**
- Use a lightweight `/health` endpoint (don't hit DB unless checking connectivity)
- `start_period` should cover app startup time
- Use `CMD-SHELL` for shell features: `test: ["CMD-SHELL", "pg_isready -U user"]`
- Avoid `wget`/`curl` if not in image; use language-native checks

**Monitoring resource usage:**
```bash
docker stats                    # live resource usage for all containers
docker stats --no-stream        # snapshot
docker inspect container | jq '.[0].State'   # container state
```

**Rule of thumb:** Always set memory limits in production (prevents one container from OOM-killing the host). Use health checks with `depends_on` for proper startup ordering. Exit code 137 = OOM killed.
