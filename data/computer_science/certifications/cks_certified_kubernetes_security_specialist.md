### CKS — Certified Kubernetes Security Specialist

**The advanced K8s security cert.** Requires current CKA as prerequisite. Covers hardening, runtime security, supply-chain, and compliance.

**Exam logistics:**
- Code: CKS
- Duration: 120 min, 15-20 hands-on tasks
- Passing: 67%
- Cost: $445 USD (one free retake)
- Validity: 2 years
- **Prerequisite: active CKA** (CKA must be valid on the day you take CKS)
- Format: remote-proctored, real clusters

**Domain weights (CKS):**

| Domain | Weight | Focus |
|---|---|---|
| 1. Cluster Setup | 10% | CIS benchmarks, network policies, ingress TLS, upgrading |
| 2. Cluster Hardening | 15% | RBAC minimization, service account hardening, external auth |
| 3. System Hardening | 15% | OS-level (minimize packages, kernel modules), IAM, AppArmor/seccomp |
| 4. Minimize Microservice Vulnerabilities | 20% | PSA (Pod Security Admission), OPA/Gatekeeper/Kyverno, mTLS, Secrets |
| 5. Supply Chain Security | 20% | Image signing, SBOM, admission controllers, image scanning |
| 6. Monitoring, Logging, and Runtime Security | 20% | Falco, audit logs, behavioral analysis, immutability |

**Key tools you must know:**

**Falco — runtime threat detection:**
```yaml
# Detect suspicious behavior (spawned shell in container, write to /etc, etc.)
- rule: Terminal Shell in Container
  desc: Shell spawned inside container
  condition: container.id != host and proc.name = bash
  output: "Shell in container (user=%user.name)"
  priority: WARNING
```

**Pod Security Admission (PSA) — replaced PSP in 1.25:**
```yaml
# Namespace labels enforce standards
apiVersion: v1
kind: Namespace
metadata:
  name: secure
  labels:
    pod-security.kubernetes.io/enforce: restricted     # block non-compliant
    pod-security.kubernetes.io/audit: restricted        # log violations
    pod-security.kubernetes.io/warn: restricted         # warn user
# Profiles: privileged | baseline | restricted
```

**OPA Gatekeeper / Kyverno — policy as code:**
```yaml
# Kyverno: block images from untrusted registries
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registry
spec:
  validationFailureAction: enforce
  rules:
    - name: only-allowlisted-registries
      match: { resources: { kinds: [Pod] } }
      validate:
        message: "Images must come from internal.registry.com"
        pattern:
          spec:
            containers:
              - image: "internal.registry.com/*"
```

**Image signing with cosign + verify with admission controller:**
```bash
# Sign an image
cosign sign --key cosign.key internal.registry.com/app:v1.0

# Verify in admission
# Use Sigstore policy-controller or Kyverno image verification
```

**Seccomp + AppArmor in PodSpec:**
```yaml
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault          # or Localhost with file path
  containers:
    - name: app
      securityContext:
        capabilities:
          drop: ["ALL"]
        runAsNonRoot: true
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
```

**kube-bench for CIS Kubernetes Benchmark:**
```bash
# Run against a cluster
kube-bench run --targets master,node
# Outputs PASS/FAIL for each CIS control with remediation steps
```

**Audit logging:**
```yaml
# /etc/kubernetes/audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: RequestResponse                 # most verbose
    resources: [{ group: "", resources: ["secrets"] }]
  - level: Metadata
    omitStages: ["RequestReceived"]
# Apply via kube-apiserver flags:
#   --audit-policy-file=/etc/kubernetes/audit-policy.yaml
#   --audit-log-path=/var/log/kube-audit.log
```

**Network policy denial (default-deny pattern):**
```yaml
# Block all ingress/egress in a namespace, then allow-list
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}                          # all pods
  policyTypes: [Ingress, Egress]
```

**Supply chain security exam topics:**
- ImagePolicyWebhook admission controller (legacy) vs Kyverno/Gatekeeper image verification
- Trivy/Grype image scanning in CI
- SBOM generation (Syft → SPDX format)
- Cosign image signing + Sigstore
- Sigstore Rekor (transparency log)

**Study path:**
- KodeKloud CKS course (Mumshad)
- Linux Foundation CKS course (official)
- killer.sh CKS practice (much harder than real exam)
- "Kubernetes Security and Observability" book
- Aqua Security's Kubernetes Security book (free PDF)

**Existing memos:**
- `devops/kubernetes/` — RBAC, probes, secrets
- `devops/security/container_security_image_scanning_trivy_rootless_pss.md`
- `design_patterns/payment_network/pci_dss_scope_reduction_tokenization_encryption_segmentation.md`

**Who it's for:** DevSecOps engineers, platform engineers in regulated industries. Prep time: 60-100 hours if you have CKA recently; less if you're already security-focused.

**Rule of thumb:** CKS is about applying security tooling (Falco, Gatekeeper, Kyverno, cosign, kube-bench) rather than memorizing K8s internals. Master one policy engine (Kyverno is easier than OPA/Gatekeeper for the exam). Default-deny network policies are exam staples. Runtime security (Falco rules) and supply-chain (image signing + admission verification) get heavy weight.
