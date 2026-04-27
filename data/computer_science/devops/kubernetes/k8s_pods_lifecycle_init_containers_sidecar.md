### Kubernetes Pods

**What is a pod:**
- Smallest deployable unit in K8s
- One or more containers sharing network namespace and storage
- Every container in a pod shares the same IP and can reach others via localhost
- Pods are ephemeral - they don't survive rescheduling

**Pod spec:**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  containers:
    - name: app
      image: myapp:1.0
      ports:
        - containerPort: 8080
      env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db_host
      resources:
        requests:
          memory: "128Mi"
          cpu: "250m"
        limits:
          memory: "256Mi"
          cpu: "500m"
      livenessProbe:
        httpGet:
          path: /health
          port: 8080
        initialDelaySeconds: 10
        periodSeconds: 15
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        periodSeconds: 5
  restartPolicy: Always
```

**Multi-container patterns:**
- **Sidecar** - helper container alongside main (log shipper, proxy, service mesh envoy)
- **Init container** - runs before main containers (DB migration, config fetch)
- **Ambassador** - proxy outbound connections (local proxy to external service)

**Init containers:**
```yaml
initContainers:
  - name: migrate
    image: myapp:1.0
    command: ["rake", "db:migrate"]
```
- Run sequentially, must succeed before main containers start
- Good for: migrations, waiting for dependencies, fetching secrets

**Pod lifecycle phases:**
- `Pending` - accepted but not yet scheduled/pulling images
- `Running` - at least one container running
- `Succeeded` - all containers exited successfully (Jobs)
- `Failed` - at least one container failed
- `Unknown` - node communication lost

**Rule of thumb:** Never create bare pods. Use Deployments/StatefulSets to manage them. Set resource requests and limits on every container. Use init containers for one-time setup.
