### Kubernetes Autoscaling (HPA, VPA)

**HPA (Horizontal Pod Autoscaler):**
- Scales the number of pod replicas based on metrics
- Requires metrics-server installed in cluster

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300    # wait 5min before scaling down
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60              # scale down max 10% per minute
```

**HPA commands:**
```bash
kubectl autoscale deployment web --min=2 --max=20 --cpu-percent=70
kubectl get hpa
kubectl describe hpa web-hpa
```

**VPA (Vertical Pod Autoscaler):**
- Adjusts resource requests/limits per container
- Modes: Off (recommendations only), Auto (evicts and resizes), Initial (set on creation)
- Cannot run HPA and VPA on the same CPU/memory metric simultaneously

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  updatePolicy:
    updateMode: "Auto"
```

**Cluster Autoscaler:**
- Scales the number of nodes
- Adds nodes when pods are Pending due to insufficient resources
- Removes underutilized nodes (respects PodDisruptionBudgets)
- Cloud-specific: EKS uses Cluster Autoscaler or Karpenter

**Karpenter (AWS):**
- Faster, more flexible node provisioning than Cluster Autoscaler
- Provisions right-sized nodes based on pending pod requirements
- Supports spot instances, multiple instance types

**Requests vs limits for autoscaling:**
- `requests` - what the scheduler guarantees (used for scheduling + HPA calculations)
- `limits` - max the container can use (throttled for CPU, OOM-killed for memory)
- HPA scales based on `requests`, not `limits`

**Rule of thumb:** Set resource requests accurately (HPA depends on them). Use HPA for stateless workloads, VPA for right-sizing. Add stabilization windows to prevent flapping. Use Karpenter on EKS for faster node scaling.
