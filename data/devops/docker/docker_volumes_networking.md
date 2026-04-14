### Docker Volumes and Networking

**Volume types:**

| Type | Syntax | Use case |
|------|--------|----------|
| Named volume | `-v dbdata:/var/lib/postgresql/data` | Persistent data (DB, uploads) |
| Bind mount | `-v /host/path:/container/path` | Dev: live code reload |
| tmpfs | `--tmpfs /tmp` | Sensitive data, no persistence |

**Volume commands:**
```bash
docker volume create mydata
docker volume ls
docker volume inspect mydata
docker volume rm mydata
docker volume prune          # remove unused volumes
```

**Named volume vs bind mount:**
- Named volume: managed by Docker, portable, survives container removal
- Bind mount: direct host filesystem access, good for development
- Named volumes are preferred for production data

**Networking modes:**

| Mode | Description | Use case |
|------|-------------|----------|
| bridge | Default, isolated network | Container-to-container on same host |
| host | Shares host network stack | Performance, no port mapping needed |
| overlay | Multi-host networking | Docker Swarm / multi-node |
| none | No networking | Security isolation |

**Network commands:**
```bash
docker network create mynet
docker network ls
docker network inspect mynet
docker network connect mynet container
docker network disconnect mynet container
docker run --network mynet --name web nginx    # containers on same network can resolve by name
```

**DNS resolution:**
- Containers on the same user-defined bridge network resolve each other by container name
- Default bridge network does NOT have automatic DNS (use `--link` or custom network)
- Example: app container connects to `db:5432` if both are on same custom network

**Docker Compose networking:**
- Compose creates a default network for the project
- Services resolve each other by service name
- `docker compose exec web ping db` works out of the box

**Rule of thumb:** Use named volumes for persistent data, bind mounts for development. Always use custom bridge networks (not default) for DNS resolution between containers.
