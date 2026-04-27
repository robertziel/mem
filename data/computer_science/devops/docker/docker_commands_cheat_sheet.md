### Docker Commands Cheat Sheet

**Image management:**
```bash
docker build -t myapp:1.0 .              # build image
docker build -f Dockerfile.prod -t app .  # custom Dockerfile
docker images                             # list images
docker rmi image_id                       # remove image
docker image prune -a                     # remove unused images
docker tag myapp:1.0 registry/myapp:1.0   # tag for registry
docker push registry/myapp:1.0            # push to registry
docker pull nginx:1.25                    # pull image
```

**Container lifecycle:**
```bash
docker run -d --name web -p 8080:80 nginx    # run detached, map port
docker run -it --rm ubuntu bash               # interactive, auto-remove
docker run -v /host:/container image          # bind mount
docker run --env-file .env image              # env vars from file
docker run --network mynet image              # connect to network
docker run --memory=512m --cpus=1 image       # resource limits
docker ps                                     # running containers
docker ps -a                                  # all containers
docker stop container                         # graceful stop (SIGTERM)
docker kill container                         # force stop (SIGKILL)
docker rm container                           # remove
docker rm -f $(docker ps -aq)                 # remove all
```

**Debugging:**
```bash
docker logs container                # view logs
docker logs -f container             # follow logs
docker logs --tail 100 container     # last 100 lines
docker exec -it container bash       # shell into running container
docker exec container env            # check env vars
docker inspect container             # full container metadata
docker stats                         # resource usage (CPU, mem)
docker top container                 # processes inside container
docker cp container:/path ./local    # copy file out
docker diff container                # filesystem changes
```

**Cleanup:**
```bash
docker system prune          # remove stopped containers, unused networks, dangling images
docker system prune -a       # + unused images
docker volume prune          # remove unused volumes
docker system df             # disk usage summary
```

**Rule of thumb:** Use `-d` for services, `-it --rm` for one-off commands. Always name your containers (`--name`). Clean up regularly with `system prune`.
