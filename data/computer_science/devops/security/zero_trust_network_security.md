### Zero Trust and Network Security

**Traditional model (perimeter-based):**
- Trust everything inside the network
- Firewall at the edge
- Problem: once an attacker is inside, they move freely (lateral movement)

**Zero Trust model:**
- "Never trust, always verify"
- Every request is authenticated and authorized, regardless of network location
- Assume breach: minimize blast radius

**Zero Trust principles:**
1. **Verify explicitly** - authenticate and authorize every request (identity + device + context)
2. **Least privilege access** - minimal permissions, just-in-time access
3. **Assume breach** - segment network, encrypt everything, monitor continuously

**Implementation in practice:**

**Network segmentation:**
- Microsegmentation: firewall rules between every service (not just at the perimeter)
- K8s: NetworkPolicies (default deny, allow specific pod-to-pod)
- VPC: security groups, private subnets, no direct internet access

**Identity-based access:**
- mTLS between services (Istio, Linkerd)
- IAM roles for service-to-service auth
- OIDC/SAML for user authentication
- Short-lived credentials (STS tokens, JWT with short expiry)

**Kubernetes zero trust:**
```yaml
# Default deny all traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

# Then explicitly allow what's needed
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-to-api
spec:
  podSelector:
    matchLabels:
      app: api
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: web
      ports:
        - port: 8080
```

**Service mesh for zero trust:**
- Automatic mTLS between all services
- Identity-based authorization policies
- Traffic encryption without app code changes
- Observability (who talks to whom)

**VPN alternatives:**
- **BeyondCorp** (Google's zero trust) - access based on identity + device trust, not network
- **Tailscale / WireGuard** - mesh VPN with identity-based access
- **AWS Verified Access** - zero-trust access to internal apps

**Rule of thumb:** Default deny everything, then allow explicitly. Use mTLS between services. Authenticate every request. Segment networks at the finest grain practical. VPNs are not zero trust - they just extend the perimeter.
