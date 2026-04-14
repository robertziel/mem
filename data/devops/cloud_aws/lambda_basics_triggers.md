### Lambda: Basics & Triggers

**What Lambda is:**
- Run code without provisioning servers
- Pay per invocation + duration (ms granularity)
- Auto-scales from 0 to thousands of concurrent executions
- Max: 15 min execution, 10 GB memory, 10 GB ephemeral storage

**Common triggers:**
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

**Environment variables:**
```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --environment "Variables={DB_HOST=postgres.internal,STAGE=prod}"
```
- Encrypted at rest with KMS
- Available via `os.environ` / `process.env`

**Basic handler pattern:**
```python
# GOOD: initialized once, reused across invocations
import boto3
s3 = boto3.client('s3')  # outside handler

def handler(event, context):
    s3.get_object(Bucket='my-bucket', Key='file.txt')  # reuses connection
```

**Rule of thumb:** Lambda for event-driven, short tasks (under 15 min). Initialize SDK clients and database connections outside the handler so they are reused across invocations. Use environment variables for configuration, never hardcode secrets. Choose the trigger pattern that matches your use case -- synchronous for APIs, async for event processing, polling for queues and streams.
