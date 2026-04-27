### Docker Compose

**Basic docker-compose.yml:**
```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://db:5432/app
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app            # bind mount for dev
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: user
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

**Commands:**
```bash
docker compose up -d              # start all services
docker compose up -d --build      # rebuild and start
docker compose down               # stop and remove containers
docker compose down -v            # + remove volumes
docker compose ps                 # list services
docker compose logs -f web        # follow logs for service
docker compose exec web bash      # shell into service
docker compose restart web        # restart one service
docker compose pull               # pull latest images
docker compose config             # validate and view resolved config
```

**Key features:**
- **depends_on** with healthcheck - wait for dependency to be ready
- **profiles** - group optional services: `profiles: [debug]`, run with `--profile debug`
- **env_file** - load env vars from file: `env_file: .env`
- **networks** - custom networks for isolation between service groups
- **extends** - inherit from another service definition
- **deploy.resources** - CPU/memory limits (respected by Docker Engine in compose v2)

**Override files:**
- `docker-compose.yml` - base config
- `docker-compose.override.yml` - auto-loaded, dev overrides
- `docker compose -f base.yml -f prod.yml up` - explicit file stacking

**Rule of thumb:** Use healthchecks with depends_on for startup ordering. Use named volumes for data, bind mounts for dev code. Keep secrets out of compose files (use env_file or Docker secrets).
