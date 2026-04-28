### AWS Lambda — Cold Starts, Layers, Concurrency

**Definition:** Lambda runs functions on-demand, scaling from zero. The trade-off is the **cold start** — first invocation provisions a container, loads code, initializes runtime. Subsequent calls reuse a warm container. Optimize cold starts via runtime choice, package size, **provisioned concurrency**, and SDK reuse.

**Cold start anatomy:**

```
1. Lambda receives invocation
2. No warm container available?
   ├── Provision micro-VM (Firecracker)
   ├── Download deployment package
   ├── Initialize runtime (JVM, Node, Python)
   ├── Run init code (outside handler)
   └── ~~~~~~~~~~~~ COLD START LATENCY ~~~~~~~~~~~~
3. Run handler
```

| Stage | Cost |
|---|---|
| Provisioning + download | ~50–200ms |
| Runtime init | Varies by language |
| Init code | Varies by what you do |
| **Total cold start** | **~100ms–2s** |

**Cold-start latency by runtime (typical):**

| Runtime | Cold start (no init code) |
|---|---|
| **Node.js** | ~100–200 ms |
| **Python** | ~150–250 ms |
| **Go** (custom runtime) | ~150–250 ms |
| **Ruby** | ~200–400 ms |
| **Java (JVM)** | ~500ms–2s |
| **C# / .NET** | ~500ms–1.5s |
| **Rust** (custom) | ~50–100 ms |

> Big-payload SDKs add hundreds of ms to init. Lazy-load when possible.

**Five mitigation strategies:**

| Strategy | Cost | Effect |
|---|---|---|
| **Provisioned Concurrency** | Pay even when idle | Zero cold starts up to provisioned count |
| **SnapStart** (Java/.NET) | Free | Snapshot init state; restore in ~100ms |
| **Smaller package** | Free | Faster download + load |
| **Lighter runtime** (Node/Python > Java) | Free | Lower base init |
| **Init outside handler** | Free | Reuse SDK clients across invocations |

**1. Initialize SDK clients outside the handler:**

```python
# ✅ GOOD — initialized once, reused across invocations
import boto3

s3 = boto3.client('s3')   # OUTSIDE handler

def handler(event, context):
    s3.get_object(Bucket='my-bucket', Key='file.txt')   # reuses connection

# ❌ BAD — creates client every invocation
def handler(event, context):
    s3 = boto3.client('s3')
    s3.get_object(...)
```

| Reason | Detail |
|---|---|
| Module-level code runs once per container | First invocation pays init cost |
| Subsequent invocations skip it | Free |
| HTTP connection pool reused | DNS, TCP, TLS amortized |

**2. Provisioned Concurrency:**

```bash
aws lambda put-provisioned-concurrency-config \
  --function-name my-fn \
  --qualifier prod \
  --provisioned-concurrent-executions 10
```

| Property | Detail |
|---|---|
| Keeps N instances warm | No cold start up to N concurrent |
| Costs even when idle | ~$0.015/hour per provisioned (varies) |
| Use for | Latency-sensitive synchronous APIs |
| Combine with autoscaling | Application Auto Scaling for Lambda |
| Doesn't help past N | N+1 caller still cold-starts |

**3. SnapStart (Java/.NET):**

| Property | Detail |
|---|---|
| Snapshot of initialized JVM state | After class loading + init |
| Restore on cold start in ~100ms | Down from 2s |
| Free | No additional cost |
| Java 11+ / .NET 8 | Specific runtimes only |
| Caveats | Random / cryptographic state restored same — re-seed at start |

**Lambda Layers — shared code/dependencies:**

```bash
# Build a layer
mkdir -p python/
pip install -t python/ requests boto3
zip -r layer.zip python/
aws lambda publish-layer-version \
  --layer-name my-deps \
  --zip-file fileb://layer.zip \
  --compatible-runtimes python3.12
```

| Property | Detail |
|---|---|
| Up to 5 layers per function | Stacked at /opt |
| Shared across many functions | Common deps |
| Function package stays small | Faster cold start |
| Use for | Common SDK versions, custom runtimes, helper libs |
| Caveat | Adds complexity to deploy pipelines |

**Concurrency limits:**

| Limit | Default |
|---|---|
| Account total concurrent executions | 1000 (regional, can request more) |
| Burst concurrency | 500–3000 (varies by region) |
| Init burst | 1000 per minute |
| Function-level concurrency | Up to account total |

**Concurrency knobs:**

| Knob | Detail |
|---|---|
| **Reserved concurrency** | Cap a function's concurrency (protect downstream) |
| **Provisioned concurrency** | Pre-warm N instances (no cold start) |
| **Unreserved pool** | Default; shared with other functions |
| **Account quota** | Soft limit; can request increase |

**Lambda vs Fargate vs EC2:**

| Property | **Lambda** | **Fargate** | **EC2** |
|---|---|---|---|
| Max duration | **15 min** | Unlimited | Unlimited |
| Scaling | Instant (0 → thousands) | Minutes | Minutes |
| Pricing | Per request + GB-sec | Per vCPU/RAM-sec | Per hour |
| Cold start | Yes (100ms–2s) | No (always running) | No |
| State | Stateless | Container | Full VM |
| Best for | Events, glue, short tasks | Long-running containers | Full control, custom kernels |

**When Lambda fits:**

| Use case | Detail |
|---|---|
| API endpoint with bursty traffic | Scales 0 → 1000 instantly |
| Event-driven (S3 PUT, SQS, EventBridge) | Native triggers |
| Cron jobs (EventBridge schedule) | Scheduled execution |
| Stream processing (Kinesis, DynamoDB Streams) | Per-record |
| Glue between AWS services | Stitch services without infra |
| Short < 15 min tasks | Within Lambda's max |

**When Lambda doesn't fit:**

| Signal | Better fit |
|---|---|
| > 15 min execution | Fargate / Step Functions |
| Persistent connections (WebSockets) | API Gateway WebSocket + Lambda — works, but care needed |
| Heavy CPU + memory | Fargate or EC2 |
| Long warm-up (ML models) | Provisioned concurrency or container |
| Latency below 100ms p99 | Provisioned concurrency or Fargate |
| Lots of small calls + tight latency | Container with HTTP keep-alive |

**Lambda performance tuning checklist:**

| Tip | Detail |
|---|---|
| Pick lighter runtime | Node / Python > Java for cold start |
| Reduce package size | Strip dev deps, prune binaries |
| Init outside handler | Reuse SDK clients, DB connections |
| Increase memory | More memory = more CPU (proportional) |
| Avoid VPC if not needed | VPC ENI attach adds cold-start time (now ~10s improved) |
| Use Layers for common deps | Smaller function packages |
| Provisioned concurrency for latency-critical | Cost trade-off |
| ARM (Graviton) | ~20% cheaper, often faster |
| Async invocation | Doesn't block caller |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Creating clients inside handler | Costs every invocation |
| Importing huge libraries | Cold start +100s of ms |
| Long timeouts hiding actual issues | Bills accumulate |
| Forgetting `15 min max` | Truncated mid-run |
| Sync calls between Lambda functions | Latency stacks |
| Provisioned concurrency without scaling | Wastes money idle |
| Storing state in /tmp | Not persisted |
| Lambda inside VPC for no reason | Cold-start hit (less now, still real) |
| Connecting to RDS without RDS Proxy | Connection storms |
| Ignoring concurrency limits | Throttling |
| Using `latest` tag for layers | Silent updates |

**Decision matrix:**

| Need | Pick |
|---|---|
| Bursty event-driven workloads | **Lambda** (default for new) |
| Long-running container | **Fargate** |
| Full OS / kernel control | **EC2** |
| Latency-critical APIs | Lambda + Provisioned Concurrency |
| Latency-very-critical | Fargate / EC2 with warm pool |

**Cross-references:**

- AWS Lambda + Step Functions for orchestration: [step_functions_*.md](aws_step_functions_state_machine_serverless.md)
- ECS Fargate: [ecs_fargate_*.md](ecs_fargate_serverless_containers.md)
- API Gateway: [api_gateway_*.md](api_gateway_routing_auth_throttling.md)
- VPC + Lambda: [aws_vpc_*.md](aws_vpc_subnets_nat_gateway_peering_transit_gateway.md)

**Rule of thumb:** **Default to Python or Node.js** for lowest cold-start latency. **Initialize SDK clients outside the handler** so they're reused. Use **Provisioned Concurrency** only for latency-critical paths (it costs money even idle). Use **Layers** for shared deps. **Lambda for short-lived event-driven work; Fargate for long-running containers; EC2 when you need full control.** Watch the **15-minute max execution** limit.
