### TLS and Certificate Management

**Certificate types:**
- **DV (Domain Validation)** - verify domain ownership (Let's Encrypt, cheapest)
- **OV (Organization Validation)** - verify organization identity
- **EV (Extended Validation)** - highest trust (green bar, expensive)
- **Wildcard** - `*.example.com` (one subdomain level)
- **SAN (Subject Alternative Name)** - multiple domains on one cert

**Certificate chain:**
```
Root CA (trusted by browsers/OS)
  -> Intermediate CA
    -> Server certificate (your domain)
```
Server must present full chain (server cert + intermediates, not root).

**Let's Encrypt (free, automated):**
- Automated Certificate Management Environment (ACME) protocol
- Certificates valid for 90 days (forces automation)
- Challenge types: HTTP-01 (file on web server), DNS-01 (TXT record)
- DNS-01 required for wildcards

**cert-manager (Kubernetes):**
```yaml
# ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v2.api.letsencrypt.org/directory
    email: ops@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx

# Certificate (auto-created via Ingress annotation)
# Or explicitly:
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
spec:
  secretName: app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - api.example.com
```

**AWS Certificate Manager (ACM):**
- Free public certificates for AWS services (ALB, CloudFront, API Gateway)
- Auto-renewal
- Cannot export private key (only usable on AWS services)
- For EC2/ECS direct: use Let's Encrypt or bring your own cert

**mTLS (Mutual TLS):**
- Both client and server present certificates
- Server verifies client identity
- Use cases: service-to-service auth, zero-trust networks
- Istio/Linkerd service mesh automate mTLS between pods

**TLS termination patterns:**
- **At load balancer** - LB decrypts, forwards HTTP internally (simplest, most common)
- **At application** - app handles TLS (needed for mTLS or compliance)
- **Pass-through** - LB forwards encrypted traffic (end-to-end encryption)

**Debugging TLS:**
```bash
# Check certificate details
openssl s_client -connect example.com:443 -servername example.com
openssl x509 -in cert.pem -text -noout

# Check expiry
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Rule of thumb:** Automate certificate renewal (cert-manager or ACM). Use Let's Encrypt for free certs. Terminate TLS at the load balancer for simplicity. Monitor certificate expiry. Use mTLS for service-to-service in zero-trust environments.
