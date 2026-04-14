### AWS ECR (Elastic Container Registry)

**What ECR does:**
- Managed Docker container image registry
- Integrated with ECS, EKS, Lambda, CodeBuild
- Private by default (IAM-controlled access)

**Push/Pull workflow:**
```bash
# 1. Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# 2. Tag image
docker tag myapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker tag myapp:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:$(git rev-parse --short HEAD)

# 3. Push
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:abc1234

# 4. Pull (ECS/EKS does this automatically)
docker pull 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:abc1234
```

**Lifecycle policies (control storage costs):**
```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 tagged images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["v"],
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Delete untagged images after 1 day",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 1
      },
      "action": { "type": "expire" }
    }
  ]
}
```

**Image scanning:**
- **Basic scanning**: on push, checks for CVEs (free, uses Clair)
- **Enhanced scanning** (Inspector): continuous scanning, OS + language packages
```bash
# Enable scan on push
aws ecr put-image-scanning-configuration \
  --repository-name myapp \
  --image-scanning-configuration scanOnPush=true

# Get scan results
aws ecr describe-image-scan-findings \
  --repository-name myapp \
  --image-id imageTag=latest
```

**Cross-account access:**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::ACCOUNT_B:root" },
    "Action": ["ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"]
  }]
}
```

**ECR vs Docker Hub vs GHCR:**
| Feature | ECR | Docker Hub | GHCR |
|---------|-----|-----------|------|
| Access control | IAM (fine-grained) | Username/token | GitHub permissions |
| Scanning | Built-in (basic + enhanced) | Paid | Basic |
| Lifecycle policies | Yes | Manual | Manual |
| AWS integration | Native (ECS, EKS, Lambda) | Pull only | Pull only |
| Cost | $0.10/GB/month | Free (rate limited) | Free (public) |
| Rate limits | None (your account) | 100 pulls/6h (anonymous) | Generous |

**CI/CD integration (GitHub Actions):**
```yaml
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123:role/github-actions
    aws-region: us-east-1

- uses: aws-actions/amazon-ecr-login@v2

- run: |
    docker build -t $ECR_REGISTRY/myapp:${{ github.sha }} .
    docker push $ECR_REGISTRY/myapp:${{ github.sha }}
```

**Rule of thumb:** ECR for any AWS container workload (ECS, EKS, Lambda). Tag with git SHA for traceability. Set lifecycle policies to auto-clean untagged images. Enable scan-on-push. Use OIDC (not access keys) for CI/CD authentication.
