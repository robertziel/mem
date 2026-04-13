### AWS Secrets Manager

**What Secrets Manager does:**
- Store and manage secrets (passwords, API keys, DB credentials, tokens)
- Automatic rotation via Lambda
- Cross-account sharing
- $0.40/secret/month + $0.05/10K API calls

**Core operations:**
```bash
# Create
aws secretsmanager create-secret \
  --name prod/db/password \
  --secret-string '{"username":"admin","password":"s3cret"}'

# Retrieve
aws secretsmanager get-secret-value --secret-id prod/db/password

# Update
aws secretsmanager update-secret --secret-id prod/db/password \
  --secret-string '{"username":"admin","password":"new_s3cret"}'

# Delete (30-day recovery window by default)
aws secretsmanager delete-secret --secret-id prod/db/password
```

**In application code (Ruby):**
```ruby
require 'aws-sdk-secretsmanager'

client = Aws::SecretsManager::Client.new(region: 'us-east-1')
secret = client.get_secret_value(secret_id: 'prod/db/password')
creds = JSON.parse(secret.secret_string)
# creds["username"], creds["password"]
```

**Auto-rotation:**
```bash
aws secretsmanager rotate-secret \
  --secret-id prod/db/password \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123:function:rotate-db \
  --rotation-rules AutomaticallyAfterDays=30
```
- Lambda function: creates new password, updates DB, stores new secret
- Versions: AWSCURRENT (active) + AWSPREVIOUS (rollback)
- Built-in rotation templates for RDS, Redshift, DocumentDB

**ECS integration (inject as env var):**
```json
{
  "secrets": [{
    "name": "DB_PASSWORD",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:123:secret:prod/db/password:password::"
  }]
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

**Secrets Manager vs SSM Parameter Store:**
| Feature | Secrets Manager | SSM Parameter Store |
|---------|----------------|-------------------|
| Auto-rotation | Yes | No |
| Cost | $0.40/secret/month | Free tier available |
| Max size | 64 KB | 4 KB (standard) |
| Cross-account | Yes | Limited |
| Best for | DB creds, rotating secrets | Config, non-rotating secrets |

**Rule of thumb:** Secrets Manager for credentials that need rotation (DB passwords, API keys with expiry). Use the built-in RDS rotation templates. Inject into ECS via task definition secrets, into EKS via External Secrets Operator. Never store secrets in code, env vars on disk, or Git.
