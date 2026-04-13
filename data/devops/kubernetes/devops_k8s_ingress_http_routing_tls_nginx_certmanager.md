### Kubernetes Ingress

**What Ingress does:**
- L7 HTTP/HTTPS routing into the cluster
- Single entry point (one LoadBalancer) routing to multiple services
- Host-based and path-based routing
- TLS termination

**Ingress requires an Ingress Controller:**
- **nginx-ingress** - most common, battle-tested
- **Traefik** - auto-discovery, Let's Encrypt built-in
- **AWS ALB Ingress Controller** - provisions actual ALBs
- **Istio Gateway** - if using Istio service mesh

**Basic Ingress:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

**Common annotations (nginx-ingress):**
```yaml
nginx.ingress.kubernetes.io/ssl-redirect: "true"
nginx.ingress.kubernetes.io/proxy-body-size: "50m"
nginx.ingress.kubernetes.io/limit-rps: "10"
nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.com"
nginx.ingress.kubernetes.io/auth-url: "https://auth.example.com/verify"
```

**TLS with cert-manager:**
```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls    # cert-manager auto-creates this
```

**Ingress vs Gateway API:**
- Ingress: simpler, widely supported, limited features
- Gateway API: newer, more expressive, role-oriented (infra vs app team)

**Rule of thumb:** Use one Ingress Controller + multiple Ingress resources instead of multiple LoadBalancer services. Pair with cert-manager for automatic TLS.
