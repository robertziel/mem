### AWS SSM Parameter Store

**What Parameter Store does:**
- Centralized configuration and secrets storage
- Hierarchical naming (path-based)
- Free tier for standard parameters
- Integrated with ECS, Lambda, CloudFormation, EC2

**Parameter types:**
| Type | Encryption | Use for |
|------|-----------|---------|
| String | No | Config values, feature flags |
| StringList | No | Comma-separated lists |
| SecureString | Yes (KMS) | Secrets, API keys, passwords |

**Core operations:**
```bash
# Store
aws ssm put-parameter --name /prod/app/api-key --value "sk_live_abc123" --type SecureString
aws ssm put-parameter --name /prod/app/log-level --value "info" --type String

# Retrieve
aws ssm get-parameter --name /prod/app/api-key --with-decryption

# Get all under a path
aws ssm get-parameters-by-path --path /prod/app/ --with-decryption --recursive

# Delete
aws ssm delete-parameter --name /prod/app/api-key
```

**Hierarchical naming convention:**
```
/{environment}/{service}/{key}
/prod/web/database-url
/prod/web/redis-url
/prod/worker/sidekiq-concurrency
/staging/web/database-url
/shared/global/sentry-dsn
```

**In application code (Ruby):**
```ruby
require 'aws-sdk-ssm'

ssm = Aws::SSM::Client.new(region: 'us-east-1')

# Single parameter
resp = ssm.get_parameter(name: '/prod/web/database-url', with_decryption: true)
database_url = resp.parameter.value

# All parameters for a service
resp = ssm.get_parameters_by_path(path: '/prod/web/', with_decryption: true, recursive: true)
config = resp.parameters.each_with_object({}) { |p, h| h[p.name.split('/').last] = p.value }
```

**Standard vs Advanced parameters:**
| Feature | Standard | Advanced |
|---------|----------|---------|
| Max size | 4 KB | 8 KB |
| Max parameters | 10,000 | 100,000 |
| Cost | Free | $0.05/parameter/month |
| Parameter policies | No | Yes (expiration, notification) |

**CloudFormation integration:**
```yaml
# Reference parameter in CloudFormation
Parameters:
  DatabaseUrl:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /prod/web/database-url
```

**Lambda integration:**
```python
import boto3
ssm = boto3.client('ssm')

# Cache parameters (don't call SSM on every Lambda invocation)
params = ssm.get_parameters_by_path(Path='/prod/func/', WithDecryption=True)
CONFIG = {p['Name'].split('/')[-1]: p['Value'] for p in params['Parameters']}
```

**Rule of thumb:** Parameter Store for configuration and non-rotating secrets (cheaper than Secrets Manager). Use SecureString for anything sensitive. Hierarchical paths for organization. Cache parameters in application code (don't fetch on every request). Use Secrets Manager instead when you need auto-rotation.
