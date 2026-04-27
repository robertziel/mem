### ConfigMaps and Secrets

**ConfigMap - non-sensitive configuration:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DB_HOST: "postgres.default.svc"
  LOG_LEVEL: "info"
  config.yaml: |
    server:
      port: 8080
      timeout: 30s
```

**Using ConfigMaps in pods:**
```yaml
# As environment variables
env:
  - name: DB_HOST
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: DB_HOST

# All keys as env vars
envFrom:
  - configMapRef:
      name: app-config

# As a mounted file
volumes:
  - name: config
    configMap:
      name: app-config
containers:
  - volumeMounts:
      - name: config
        mountPath: /etc/config
```

**Secret - sensitive data:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
data:
  username: YWRtaW4=        # base64 encoded (NOT encrypted)
  password: cGFzc3dvcmQ=
```

```bash
# Create from command line
kubectl create secret generic db-creds \
  --from-literal=username=admin \
  --from-literal=password=secret123
```

**Important: K8s Secrets are only base64 encoded, not encrypted!**

**Better alternatives for secrets:**
- **Sealed Secrets** - encrypted in Git, decrypted by controller in cluster
- **External Secrets Operator** - syncs from AWS Secrets Manager, Vault, etc.
- **HashiCorp Vault** - full secrets management with rotation
- **AWS Secrets Manager / SSM Parameter Store** - cloud-native

**ConfigMap vs Secret:**
| Feature | ConfigMap | Secret |
|---------|-----------|--------|
| Data | Non-sensitive config | Credentials, tokens, keys |
| Encoding | Plain text | Base64 |
| Size limit | 1 MiB | 1 MiB |
| Encryption at rest | No | Optional (EncryptionConfiguration) |

**Hot reload:**
- Mounted ConfigMaps update automatically (kubelet sync period, ~60s)
- Environment variables do NOT update without pod restart
- Use a sidecar or app-level file watcher for instant reload

**Rule of thumb:** Use ConfigMaps for app config, Secrets for credentials. Never store real secrets in plain K8s Secrets in Git. Use External Secrets Operator or Sealed Secrets for GitOps workflows.
