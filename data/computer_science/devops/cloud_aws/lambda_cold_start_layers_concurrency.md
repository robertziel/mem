### Lambda: Cold Starts, Layers & Concurrency

**Cold start problem:**
- First invocation: Lambda provisions container, loads code, initializes runtime
- Subsequent: reuses warm container (fast)
- Cold start latency: ~100ms (Python/Node), ~500ms-2s (Java/C#)

**Mitigation strategies:**
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

**Concurrency:**
- Default: 1000 concurrent executions per account per region
- Reserved concurrency: guarantee N for a function (limit others)
- Provisioned concurrency: keep N warm (no cold starts)

**Lambda vs Fargate vs EC2:**
| Feature | Lambda | Fargate | EC2 |
|---------|--------|---------|-----|
| Max duration | 15 min | Unlimited | Unlimited |
| Scaling | Instant (0 to thousands) | Minutes | Minutes |
| Pricing | Per invocation + ms | Per vCPU/memory/sec | Per hour |
| Cold start | Yes (100ms-2s) | No | No |
| Best for | Short tasks, events, glue | Long-running containers | Full control |

**Rule of thumb:** Default to Python or Node.js for lowest cold start latency. Use Provisioned Concurrency only for latency-critical paths where cold starts are unacceptable -- it costs money even when idle. Use Layers for shared dependencies across functions. Keep packages small. If your workload runs longer than 15 minutes or needs persistent connections, use Fargate instead.
