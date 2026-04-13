### AWS Lambda (Serverless Functions)

**What Lambda is:**
- Run code without provisioning servers
- Pay per invocation + duration (ms granularity)
- Auto-scales from 0 to thousands of concurrent executions
- Max: 15 min execution, 10 GB memory, 10 GB ephemeral storage

**Triggers (event sources):**
| Trigger | Pattern | Example |
|---------|---------|---------|
| API Gateway | Synchronous | REST/HTTP API endpoint |
| S3 | Async event | Process file on upload |
| SQS | Polling | Process queue messages |
| SNS | Async event | React to notifications |
| EventBridge | Async event | Scheduled tasks, event routing |
| DynamoDB Streams | Polling | React to DB changes (CDC) |
| Kinesis | Polling | Process streaming data |
| CloudWatch Events | Scheduled | Cron-like scheduled tasks |
| ALB | Synchronous | HTTP requests via load balancer |

**Cold start:**
- First invocation: Lambda provisions container, loads code, initializes runtime
- Subsequent: reuses warm container (fast)
- Cold start latency: ~100ms (Python/Node), ~500ms-2s (Java/C#)

**Mitigating cold starts:**
- **Provisioned concurrency**: keep N instances warm ($$$)
- **SnapStart** (Java): snapshot initialized state, restore on cold start
- Keep deployment package small (fewer dependencies = faster init)
- Use lightweight runtimes (Node.js, Python over Java for latency-sensitive)
- Initialize SDK clients outside the handler (reused across invocations)

```python
# GOOD: initialized once, reused across invocations
import boto3
s3 = boto3.client('s3')  # outside handler

def handler(event, context):
    s3.get_object(Bucket='my-bucket', Key='file.txt')  # reuses connection
```

**Lambda Layers:**
- Shared code/dependencies packaged separately from function code
- Up to 5 layers per function
- Use for: common libraries, shared utilities, custom runtimes
```bash
# Create layer with dependencies
pip install -t python/ requests boto3
zip -r layer.zip python/
aws lambda publish-layer-version --layer-name my-deps --zip-file fileb://layer.zip
```

**Environment variables:**
```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --environment "Variables={DB_HOST=postgres.internal,STAGE=prod}"
```
- Encrypted at rest with KMS
- Available via `os.environ` / `process.env`

**Concurrency:**
- Default: 1000 concurrent executions per account per region
- Reserved concurrency: guarantee N for a function (limit others)
- Provisioned concurrency: keep N warm (no cold starts)

**Lambda vs ECS Fargate vs EC2:**
| Feature | Lambda | Fargate | EC2 |
|---------|--------|---------|-----|
| Max duration | 15 min | Unlimited | Unlimited |
| Scaling | Instant (0 to thousands) | Minutes | Minutes |
| Pricing | Per invocation + ms | Per vCPU/memory/sec | Per hour |
| Cold start | Yes (100ms-2s) | No | No |
| Best for | Short tasks, events, glue | Long-running containers | Full control |

**Rule of thumb:** Lambda for event-driven, short tasks (< 15 min). Initialize clients outside handler. Keep packages small. Use Provisioned Concurrency only for latency-critical paths. Use Layers for shared dependencies. Default to Python/Node for lowest cold start.
