### Kubernetes Services

**What a Service does:**
- Stable network endpoint for a set of pods (pods are ephemeral, IPs change)
- Load balances traffic across matching pods
- Provides DNS name: `service-name.namespace.svc.cluster.local`

**Service types:**

| Type | Access | Use case |
|------|--------|----------|
| ClusterIP | Internal only | Default. Service-to-service communication |
| NodePort | External via node IP:port | Dev/testing, port 30000-32767 |
| LoadBalancer | External via cloud LB | Production external access |
| ExternalName | DNS CNAME alias | Point to external service |

**ClusterIP example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: ClusterIP
  selector:
    app: web        # matches pods with label app=web
  ports:
    - port: 80            # service port
      targetPort: 8080     # container port
```

**LoadBalancer example:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-public
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - port: 443
      targetPort: 8080
```

**Headless Service (no load balancing):**
```yaml
spec:
  clusterIP: None     # headless
  selector:
    app: db
```
- Returns individual pod IPs in DNS (A records)
- Used with StatefulSets for direct pod addressing: `pod-0.service.namespace.svc`

**DNS resolution within cluster:**
- Same namespace: `http://web:80`
- Cross namespace: `http://web.other-namespace:80`
- Fully qualified: `http://web.default.svc.cluster.local:80`

**Rule of thumb:** Use ClusterIP for internal services, LoadBalancer for external. Prefer Ingress over multiple LoadBalancers to save cost. Use headless services with StatefulSets.
