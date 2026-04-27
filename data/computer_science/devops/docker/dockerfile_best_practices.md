### Dockerfile Best Practices

**Multi-stage build (reduce image size):**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

**Layer caching - order matters:**
```dockerfile
# Dependencies change less often -> cached layer
COPY package*.json ./
RUN npm ci
# Source code changes often -> busts cache from here
COPY . .
```

**Image size optimization:**
- Use `-alpine` or `-slim` base images
- Multi-stage builds: build in one stage, copy artifacts to minimal stage
- Combine RUN commands to reduce layers: `RUN apt-get update && apt-get install -y pkg && rm -rf /var/lib/apt/lists/*`
- Use `.dockerignore` to exclude node_modules, .git, tests, docs

**Security:**
- Never run as root: `USER node` or `USER 1000`
- Don't store secrets in images (use build args or runtime env)
- Pin base image versions: `node:20.11-alpine` not `node:latest`
- Scan images: `docker scout`, Trivy, Snyk
- Use `COPY` over `ADD` (ADD auto-extracts tarballs, fetches URLs)

**Essential instructions:**
- `FROM` - base image
- `WORKDIR` - set working directory
- `COPY` / `ADD` - copy files into image
- `RUN` - execute command during build
- `ENV` - set environment variable
- `EXPOSE` - document port (doesn't publish)
- `CMD` - default command (overridable)
- `ENTRYPOINT` - fixed command (CMD becomes args)
- `HEALTHCHECK` - container health probe
- `ARG` - build-time variable

**ENTRYPOINT vs CMD:**
- `ENTRYPOINT ["python"]` + `CMD ["app.py"]` -> `python app.py`
- CMD alone: `docker run image custom-command` replaces it
- ENTRYPOINT + CMD: `docker run image custom-arg` replaces only CMD

**Rule of thumb:** Use multi-stage builds, order layers by change frequency, run as non-root, pin versions, and keep images under 200MB when possible.
