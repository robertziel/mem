### AWS Secrets Manager, SSM Parameter Store & KMS

**Secrets Manager vs SSM Parameter Store:**

| Feature | Secrets Manager | SSM Parameter Store |
|---------|----------------|-------------------|
| Purpose | Secrets (passwords, API keys, DB creds) | Config + secrets |
| Auto-rotation | Yes (Lambda-based) | No |
| Cost | $0.40/secret/month + API calls | Free tier (standard), $0.05/advanced |
| Max size | 64 KB | 4 KB (standard), 8 KB (advanced) |
| Cross-account | Yes | Limited |
| Best for | DB credentials, API keys that rotate | Feature flags, config, non-rotating secrets |

**Secrets Manager:**
```bash
# Create
aws secretsmanager create-secret \
  --name prod/db/password \
  --secret-string '{"username":"admin","password":"s3cret"}'

# Retrieve
aws secretsmanager get-secret-value --secret-id prod/db/password

# Rotate (auto with Lambda)
aws secretsmanager rotate-secret \
  --secret-id prod/db/password \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123:function:rotate-db
```

**In application code (Ruby):**
```ruby
require 'aws-sdk-secretsmanager'

client = Aws::SecretsManager::Client.new(region: 'us-east-1')
secret = client.get_secret_value(secret_id: 'prod/db/password')
creds = JSON.parse(secret.secret_string)
# creds["username"], creds["password"]
```

**SSM Parameter Store:**
```bash
# Store (SecureString = encrypted with KMS)
aws ssm put-parameter \
  --name /prod/app/api-key \
  --value "sk_live_abc123" \
  --type SecureString

# Retrieve
aws ssm get-parameter --name /prod/app/api-key --with-decryption

# Hierarchical (get all under a path)
aws ssm get-parameters-by-path --path /prod/app/ --with-decryption
```

**Parameter naming convention:**
```
/{environment}/{service}/{key}
/prod/web/database-url
/prod/web/redis-url
/staging/worker/api-key
```

**KMS (Key Management Service):**
- Managed encryption keys for encrypting data across AWS services
- Used by: S3 (SSE-KMS), EBS encryption, Secrets Manager, SSM SecureString, RDS encryption
- **CMK (Customer Master Key)**: AWS-managed or customer-managed
- **Envelope encryption**: KMS encrypts a data key, data key encrypts your data

```bash
# Encrypt
aws kms encrypt --key-id alias/my-key --plaintext "secret data"

# Decrypt
aws kms decrypt --ciphertext-blob fileb://encrypted.bin
```

**KMS key types:**
| Type | Management | Cost | Use when |
|------|-----------|------|----------|
| AWS-managed | AWS rotates | Free (for AWS services) | Default, simple |
| Customer-managed | You control policy + rotation | $1/month + API calls | Cross-account, custom policy, audit |

**ECS/EKS integration:**
```json
// ECS task definition — inject secret as env var
{
  "secrets": [
    {
      "name": "DB_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123:secret:prod/db/password:password::"
    }
  ]
}
```

**EKS with External Secrets Operator:**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: db-creds
  data:
    - secretKey: password
      remoteRef:
        key: prod/db/password
        property: password
```

**Rule of thumb:** Secrets Manager for credentials that need rotation (DB passwords). SSM Parameter Store for config and secrets that don't rotate (cheaper). KMS encrypts everything behind the scenes. Never store secrets in env vars on EC2, code, or Git. Use IAM roles to control which services can read which secrets.
