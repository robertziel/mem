### AWS Lambda — Basics & Triggers

**Definition:** **Lambda** runs your code on demand without provisioning servers. **Pay per invocation + duration** (ms granularity). Auto-scales **0 → thousands** instantly. Hard limits: **15-min execution**, **10 GB memory**, **10 GB ephemeral storage**. Pick by **trigger pattern**: synchronous (API), async (event), or polling (queue/stream).

**Lambda fundamentals:**

| Property | Detail |
|---|---|
| Run code without servers | AWS manages compute |
| Pricing | Per invocation ($) + per GB-second |
| Auto-scaling | 0 → 1,000 default concurrent (raisable) |
| **Max execution** | 15 minutes |
| **Max memory** | 10 GB (CPU scales with memory) |
| **Ephemeral storage** | `/tmp` up to 10 GB |
| Runtimes | Node, Python, Ruby, Java, Go, .NET, custom |
| Cold start | 100ms–2s (varies by runtime) |
| Architectures | x86 + ARM (Graviton — ~20% cheaper) |

**Common triggers:**

| Trigger | Pattern | Use case |
|---|---|---|
| **API Gateway** | Synchronous | REST / HTTP API endpoint |
| **ALB** | Synchronous | HTTP via load balancer |
| **CloudFront Functions / Lambda@Edge** | Synchronous | Edge compute |
| **S3** | Async event | Process file on upload |
| **SQS** | Polling | Process queue messages |
| **SNS** | Async event | React to notifications |
| **EventBridge** | Async event | Scheduled tasks, event routing |
| **DynamoDB Streams** | Polling | React to DB changes (CDC) |
| **Kinesis Streams** | Polling | Process streaming data |
| **CloudWatch Events** | Scheduled | Cron-like scheduled tasks |
| **Cognito** | Sync | Pre-/post-auth hooks |
| **AppSync** | Sync | GraphQL resolver |
| **Step Functions** | Sync (orchestrated) | Workflow step |

**Three invocation models:**

| Model | Detail | Examples |
|---|---|---|
| **Synchronous** | Caller waits for response | API Gateway, ALB, Cognito |
| **Asynchronous (event)** | Caller dispatches; Lambda processes later | S3, SNS, EventBridge |
| **Polling (event source mapping)** | Lambda polls source | SQS, Kinesis, DynamoDB Streams |

**Sync vs async behavior on errors:**

| Mode | On failure |
|---|---|
| **Sync** | Caller gets error; caller decides retry |
| **Async** | Lambda retries (default 2 retries with delay); then DLQ if configured |
| **Polling (SQS)** | Visibility timeout; redelivered |
| **Polling (streams)** | Per-shard checkpoint; retries until succeeds or expires |

**Environment variables — config:**

```bash
aws lambda update-function-configuration \
  --function-name my-func \
  --environment "Variables={DB_HOST=postgres.internal,STAGE=prod}"
```

| Property | Detail |
|---|---|
| Encrypted at rest with KMS | Default |
| Available in handler via `os.environ` / `process.env` | Standard env-var interface |
| Use Secrets Manager / Parameter Store for secrets | Don't put secrets in env vars |
| 4 KB total limit | All env vars combined |

**Handler basics — initialize SDK clients OUTSIDE:**

```python
# ✅ GOOD — initialized once, reused across invocations
import boto3

s3 = boto3.client('s3')   # OUTSIDE handler — runs once per container

def handler(event, context):
    response = s3.get_object(Bucket='my-bucket', Key='file.txt')
    return process(response['Body'].read())

# ❌ BAD — creates client every invocation
def handler(event, context):
    s3 = boto3.client('s3')   # creates connection pool every call
    return s3.get_object(...)
```

**Why init outside the handler:**

| Reason | Detail |
|---|---|
| Module-level code runs once per container | First invocation pays cost |
| Subsequent invocations skip init | Free |
| HTTP connection pool reused | TCP / TLS amortized |
| DB connections reused | Avoid connection storms |
| Container reuse common | Same warm container handles many invocations |

**Memory ↔ CPU relationship:**

| Memory | CPU |
|---|---|
| 128 MB | Slowest (1/12 vCPU) |
| 1,769 MB | 1 vCPU |
| 3,538 MB | 2 vCPU |
| 5,308 MB | 3 vCPU |
| 10,240 MB | 6 vCPU |

> **More memory = more CPU** (linearly). Often paying for more memory is cheaper because functions complete faster.

**Concurrency model:**

| Concept | Detail |
|---|---|
| **One container = one execution at a time** | Sequential within a container |
| **Many containers = parallel** | Auto-scaled up to limit |
| **Account default**: 1,000 concurrent | Raisable per region |
| **Reserved concurrency** | Cap a function (or guarantee) |
| **Provisioned concurrency** | Pre-warm N containers (no cold start) |
| **Burst limit**: 500–3,000 | Per region, depending on age |

**`event` and `context` objects:**

```python
def handler(event, context):
    # event:
    #   - For API GW: HTTP method, headers, body, queryStringParameters
    #   - For S3: bucket, key, eventName
    #   - For SQS: Records[].body
    #
    # context:
    #   - aws_request_id
    #   - function_name, function_version, memory_limit_in_mb
    #   - get_remaining_time_in_millis()
    #   - identity (Cognito), client_context

    request_id = context.aws_request_id
    remaining_ms = context.get_remaining_time_in_millis()
    ...
```

**Logging:**

| Detail | Behavior |
|---|---|
| `print` / `console.log` | Goes to CloudWatch Logs automatically |
| Log group | `/aws/lambda/<function-name>` |
| Stream per container | Multiple streams over time |
| Cost | Per-MB ingestion + storage |
| Use structured logs (JSON) | Better filtering / Insights |

**Deployment options:**

| Method | Detail |
|---|---|
| **ZIP file upload** (≤ 250 MB unzipped, ≤ 50 MB zipped) | Code + deps |
| **Container image** (≤ 10 GB) | OCI image; supports custom runtime |
| **SAM** | Serverless Application Model template |
| **CDK** | Infrastructure-as-code with Lambda support |
| **Serverless Framework** | OSS deployment tool |
| **Terraform** | IaC |

**Lambda Layers — shared dependencies:**

| Property | Detail |
|---|---|
| Up to **5 layers** per function | Stacked at /opt |
| Reusable across many functions | Common deps |
| Smaller function package | Faster cold start |
| Use for | SDKs, helper libs, custom runtimes |
| Layer per language | Compatibility check |

**Cold start — quick view:**

| Runtime | Typical cold start |
|---|---|
| Node.js | 100–200 ms |
| Python | 150–250 ms |
| Go (custom) | 150–250 ms |
| Ruby | 200–400 ms |
| Java (no SnapStart) | 500ms–2s |
| Java (with SnapStart) | ~100 ms |
| C# / .NET | 500ms–1.5s |
| Rust (custom) | 50–100 ms |

**Mitigation strategies for cold starts:**

| Strategy | Detail |
|---|---|
| **Provisioned Concurrency** | Pre-warm N (no cold starts up to N) |
| **SnapStart** (Java / .NET) | Snapshot + restore in ~100ms |
| Lighter runtime (Node / Python) | Faster init |
| Smaller package | Faster download |
| Init outside handler | Reuse SDK clients |

**Lambda vs Fargate vs EC2:**

| Property | **Lambda** | **Fargate** | **EC2** |
|---|---|---|---|
| Max duration | **15 min** | Unlimited | Unlimited |
| Scaling | Instant (0 → thousands) | Minutes | Minutes |
| Pricing | Per invocation + ms | Per vCPU/RAM-sec | Per hour |
| State | Stateless | Container | Full VM |
| Cold start | Yes (100ms–2s) | No (always running) | No |
| Best for | Events, glue, short tasks | Long-running containers | Full control |

**Common patterns:**

| Pattern | Detail |
|---|---|
| **API endpoint** | API GW → Lambda → DB |
| **Event trigger** | S3 PUT → Lambda → process |
| **Queue worker** | SQS → Lambda → process message |
| **CDC pipeline** | DynamoDB Streams → Lambda → Snowflake |
| **Cron jobs** | EventBridge schedule → Lambda |
| **Image processing** | S3 upload → Lambda → resize → S3 thumbs |
| **Webhook receiver** | API GW → Lambda → SQS → workers |
| **Step Functions** | Orchestrate multiple Lambdas as a workflow |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Creating clients inside handler | Adds time per invocation |
| Long-running tasks > 15 min | Hard fail |
| Storing state in `/tmp` (assumed persistent) | Lost between invocations |
| Hardcoding secrets | Use Secrets Manager |
| Synchronous Lambda → DB without RDS Proxy | Connection storm |
| Not using Lambda destinations / DLQ for async | Lost failures |
| Inadequate logging | Hard to debug |
| `latest` tag for layers | Silent updates |
| Not understanding sync vs async retry behavior | Surprising duplicates |
| Spending without alarms | Cost surprises |

**Decision matrix:**

| Need | Pick |
|---|---|
| HTTP API | API Gateway + Lambda |
| Event-driven processing | S3 / SNS / EventBridge → Lambda |
| Queue worker | SQS → Lambda |
| Streaming | Kinesis / DynamoDB Streams → Lambda |
| Cron | EventBridge → Lambda |
| Long-running > 15 min | Fargate / Step Functions |
| Heavy CPU + memory | Fargate or EC2 |
| Latency-critical (<100ms p99) | Provisioned Concurrency or Fargate |

**Cross-references:**

- Cold starts + Layers + concurrency deep dive: [lambda_cold_start_*.md](lambda_cold_start_layers_concurrency.md)
- API Gateway: [api_gateway_*.md](api_gateway_routing_auth_throttling.md)
- ECS Fargate: [ecs_fargate_*.md](ecs_fargate_serverless_containers.md)
- Step Functions: [step_functions_*.md](aws_step_functions_state_machine_serverless.md)
- IAM roles: [iam_*.md](iam_roles_policies_least_privilege.md)

**Rule of thumb:** **Lambda for event-driven, short tasks (< 15 min).** Initialize SDK clients **outside the handler** so they're reused across invocations. Use **environment variables** for config, **Secrets Manager** for secrets. Pick the **trigger pattern** that matches your use case: **synchronous** for APIs, **async** for events, **polling** for queues / streams. Watch the **15-minute max** — for longer tasks use Fargate or Step Functions.
