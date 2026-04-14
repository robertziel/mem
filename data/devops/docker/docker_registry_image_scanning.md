### Docker Registry and Image Scanning

**Registry types:**
- **Docker Hub** - public default, rate-limited (100 pulls/6h anonymous)
- **Amazon ECR** - AWS-native, IAM-integrated, lifecycle policies
- **GitHub Container Registry (ghcr.io)** - tied to GitHub repos
- **Google Artifact Registry** - GCP-native
- **Self-hosted** - Harbor, GitLab Container Registry

**Pushing to registry:**
```bash
# Docker Hub
docker login
docker tag myapp:1.0 username/myapp:1.0
docker push username/myapp:1.0

# ECR
aws ecr get-login-password | docker login --username AWS --password-stdin 123456.dkr.ecr.us-east-1.amazonaws.com
docker tag myapp:1.0 123456.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0
docker push 123456.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0
```

**Tagging strategy:**
- `myapp:latest` - mutable, avoid in production (ambiguous)
- `myapp:1.2.3` - semantic version, immutable
- `myapp:abc1234` - git SHA, traceable to exact commit
- `myapp:main-abc1234` - branch + SHA
- Best practice: tag with git SHA for traceability, semantic version for releases

**ECR lifecycle policies:**
- Auto-delete untagged images after N days
- Keep only last N tagged images
- Reduces storage costs

**Image scanning:**
```bash
# Trivy (most popular open-source scanner)
trivy image myapp:1.0
trivy image --severity HIGH,CRITICAL myapp:1.0
trivy fs .                     # scan filesystem/IaC

# Docker Scout (built-in)
docker scout cves myapp:1.0
docker scout recommendations myapp:1.0

# Snyk
snyk container test myapp:1.0
```

**CI pipeline integration:**
- Scan on every PR / before push to registry
- Fail pipeline on CRITICAL/HIGH vulnerabilities
- Scan base images periodically (new CVEs appear for existing images)

**Rule of thumb:** Never use `:latest` in production. Tag with git SHA for traceability. Scan images in CI and block critical vulnerabilities. Use ECR lifecycle policies to control storage costs.
