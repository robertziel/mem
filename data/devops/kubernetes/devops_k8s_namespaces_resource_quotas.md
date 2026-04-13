### Namespaces and Resource Quotas

**Namespaces:**
- Logical isolation within a cluster
- Scope for RBAC, NetworkPolicies, ResourceQuotas
- NOT a security boundary (use separate clusters for hard isolation)

**Default namespaces:**
- `default` - where resources go if no namespace specified
- `kube-system` - K8s system components (coredns, kube-proxy)
- `kube-public` - publicly readable (rarely used)
- `kube-node-lease` - node heartbeats

```bash
kubectl create namespace staging
kubectl get namespaces
kubectl get pods -n staging              # pods in namespace
kubectl get pods --all-namespaces        # pods across all namespaces
kubectl config set-context --current --namespace=staging   # set default
```

**ResourceQuota (per namespace):**
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: staging
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    services.loadbalancers: "2"
    persistentvolumeclaims: "10"
```

**LimitRange (default limits per pod/container):**
```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: staging
spec:
  limits:
    - type: Container
      default:           # default limits if not specified
        cpu: "500m"
        memory: "256Mi"
      defaultRequest:    # default requests if not specified
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "2"
        memory: "2Gi"
      min:
        cpu: "50m"
        memory: "64Mi"
```

**Namespace patterns:**
- Per environment: `dev`, `staging`, `production`
- Per team: `team-backend`, `team-data`
- Per application: `app-frontend`, `app-api`

**Cross-namespace access:**
- Services: `service-name.namespace.svc.cluster.local`
- NetworkPolicies can allow/deny cross-namespace traffic
- RBAC can grant cross-namespace access

**Rule of thumb:** Use namespaces for logical separation and resource governance. Always set ResourceQuotas in shared clusters. Use LimitRange to enforce defaults so no pod runs without resource requests.
