### Container and Image Security

**Image security:**
- Use minimal base images (Alpine, distroless, scratch)
- Pin image versions (never use `latest` in production)
- Scan images for CVEs: `trivy image myapp:1.0`
- Multi-stage builds: build dependencies don't end up in final image
- Don't install unnecessary packages

**Scanning tools:**
- **Trivy** - open-source, images + filesystems + IaC + SBOM
- **Snyk** - commercial, dev-focused, IDE integration
- **Docker Scout** - built into Docker Desktop/CLI
- **Grype** - open-source, by Anchore
- **ECR scanning** - basic scanning on push

**CI pipeline integration:**
```yaml
# GitHub Actions - scan and fail on critical
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    severity: CRITICAL,HIGH
    exit-code: 1
```

**Runtime container security:**
```yaml
# Kubernetes pod security
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
```

**Pod Security Standards (PSS):**
- **Privileged** - unrestricted (system components only)
- **Baseline** - minimally restrictive (prevent known privilege escalations)
- **Restricted** - hardened (best practice for untrusted workloads)

```yaml
# Enforce restricted on namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

**Supply chain security:**
- Sign images with Cosign/Sigstore
- Verify signatures before deploying
- Use SBOM (Software Bill of Materials) to track dependencies
- Use admission controllers (OPA Gatekeeper, Kyverno) to enforce policies

**Network security:**
- Use NetworkPolicies to restrict pod-to-pod traffic
- Default deny all, then allow explicitly
- Service mesh (Istio) for mTLS between services

**Rule of thumb:** Scan images in CI, block critical CVEs. Run as non-root with read-only filesystem. Drop all capabilities. Enforce Pod Security Standards at namespace level. Sign and verify images in production.
