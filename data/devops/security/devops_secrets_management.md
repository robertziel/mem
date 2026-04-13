### Secrets Management

**The problem:**
- Secrets (API keys, DB passwords, tokens) must not be in code, Git, or Docker images
- Need: encryption, access control, rotation, audit logging

**Solutions landscape:**

| Tool | Type | Best for |
|------|------|----------|
| HashiCorp Vault | Self-hosted/cloud | Full-featured, dynamic secrets |
| AWS Secrets Manager | Managed | AWS-native, auto-rotation |
| AWS SSM Parameter Store | Managed | Simple key-value, free tier |
| Sealed Secrets | K8s | Encrypted secrets in Git |
| External Secrets Operator | K8s | Sync from Vault/AWS to K8s secrets |
| SOPS | File encryption | Encrypt specific values in YAML/JSON |

**HashiCorp Vault:**
- Centralized secrets store with fine-grained policies
- Dynamic secrets: generate short-lived DB credentials on demand
- Auto-rotation: rotate secrets automatically
- Audit logging: who accessed what, when
- Auth methods: OIDC, K8s ServiceAccount, IAM, AppRole

**AWS Secrets Manager:**
```bash
# Store a secret
aws secretsmanager create-secret --name prod/db-password --secret-string "p@ssw0rd"

# Retrieve in code
aws secretsmanager get-secret-value --secret-id prod/db-password

# Enable rotation with Lambda
aws secretsmanager rotate-secret --secret-id prod/db-password --rotation-lambda-arn arn:...
```

**External Secrets Operator (K8s):**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-creds
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-creds           # K8s Secret to create
  data:
    - secretKey: password
      remoteRef:
        key: prod/db-password
```

**Sealed Secrets (GitOps-friendly):**
```bash
# Encrypt a secret (only the controller in-cluster can decrypt)
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
# sealed-secret.yaml is safe to commit to Git
```

**Environment variable injection patterns:**
- Kubernetes: ConfigMaps + External Secrets -> env vars or mounted files
- ECS: Secrets Manager ARN in task definition
- Lambda: environment variables (encrypted with KMS)
- Docker: `--env-file` (never bake into image)

**What NOT to do:**
- Hardcode secrets in source code
- Commit `.env` files to Git
- Store secrets in plain K8s Secrets in Git (only base64, not encrypted)
- Share secrets via Slack, email, or wikis
- Use the same secret across environments

**Rule of thumb:** Use a dedicated secrets manager (Vault or AWS Secrets Manager). Rotate secrets automatically. Use External Secrets Operator for K8s. Never store secrets in Git, even encrypted, without proper tooling (Sealed Secrets, SOPS).
