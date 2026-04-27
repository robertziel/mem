### Kubernetes DaemonSet

**What DaemonSet does:**
- Runs exactly one pod on every node (or a subset via nodeSelector)
- New nodes automatically get the pod
- Used for node-level agents

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentbit
spec:
  selector:
    matchLabels:
      app: fluentbit
  template:
    metadata:
      labels:
        app: fluentbit
    spec:
      containers:
        - name: fluentbit
          image: fluent/fluent-bit:latest
          volumeMounts:
            - name: varlog
              mountPath: /var/log
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
```

**Common use cases:** log collectors (Fluent Bit), monitoring agents (Datadog, Prometheus node-exporter), network plugins (CNI), storage drivers (CSI).

**Rule of thumb:** DaemonSet for per-node infrastructure agents. Don't use for application workloads — use Deployment instead.
