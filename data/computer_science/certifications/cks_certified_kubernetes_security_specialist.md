### CKS — Certified Kubernetes Security Specialist

**Exam quick facts:**

| Item | Value |
|---|---|
| Code | CKS |
| Duration | 120 min, 15–20 hands-on tasks |
| Pass | 67% |
| Cost | $445 USD (one free retake) |
| Validity | 2 years |
| **Prerequisite** | **Active CKA** (must be valid on exam day) |
| Format | Remote-proctored, real cluster terminal |

**Domain weights:**

| # | Domain | Weight | Headline focus |
|---|---|---:|---|
| 1 | Cluster Setup | 10% | CIS benchmarks, NetworkPolicy, ingress TLS, k8s upgrades |
| 2 | Cluster Hardening | 15% | RBAC minimization, ServiceAccount hardening, external auth |
| 3 | System Hardening | 15% | OS minimization, kernel modules, AppArmor, seccomp |
| 4 | Microservice Vulns | 20% | Pod Security Admission, OPA/Gatekeeper or Kyverno, mTLS, Secrets |
| 5 | Supply Chain | 20% | Image signing (cosign), SBOM, image scanning, admission verification |
| 6 | Runtime Security | 20% | Falco, audit logs, immutability, behavioral detection |

**Tool → exam role:**

| Tool | What it does | Where it shows up | Memorable knob |
|---|---|---|---|
| `kube-bench` | Runs CIS Benchmark against a cluster | Cluster Setup | `kube-bench run --targets master,node` |
| `kubeadm` | Cluster install/upgrade | Cluster Setup | `kubeadm upgrade plan` / `apply` |
| Pod Security Admission (PSA) | Replaces deprecated PodSecurityPolicy (since 1.25) | Microservice Vulns | NS labels: `pod-security.kubernetes.io/enforce: restricted` |
| Kyverno | Policy-as-code, validation/mutation/generation | Microservice Vulns + Supply Chain | `ClusterPolicy` with `validationFailureAction: enforce` (easier than OPA on the exam) |
| OPA Gatekeeper | Policy-as-code via Rego ConstraintTemplates | Microservice Vulns | `ConstraintTemplate` + `Constraint` pair |
| seccomp | Syscall filter on container | System Hardening | `seccompProfile: { type: RuntimeDefault }` |
| AppArmor | MAC profile applied to container | System Hardening | Annotation `container.apparmor.security.beta.kubernetes.io/<name>: localhost/<profile>` |
| `cosign` | Image signing | Supply Chain | `cosign sign --key cosign.key <image>` |
| Sigstore Rekor | Transparency log for signatures | Supply Chain | Backs cosign — referenced in policy verifications |
| Trivy / Grype | Image vulnerability scanning | Supply Chain | `trivy image <ref>` in CI |
| Syft | SBOM generation (SPDX/CycloneDX) | Supply Chain | `syft <image> -o spdx-json` |
| Falco | Runtime threat detection (eBPF / sysdig) | Runtime Security | YAML rules with `condition` + `output` (e.g. shell in container) |
| Audit policy | API-server audit log | Runtime Security | `--audit-policy-file=...` + `--audit-log-path=...` |

**PSA profiles:**

| Profile | Allows | Use for |
|---|---|---|
| `privileged` | Anything | System workloads only |
| `baseline` | Minimally restrictive — blocks known privileged escalations | Most app namespaces |
| `restricted` | Strictly hardened — `runAsNonRoot`, drop ALL caps, RuntimeDefault seccomp | Untrusted workloads, the CKS exam answer |

NS label modes: `enforce` (block), `audit` (log), `warn` (kubectl warning). Use all three together.

**Container-level hardening checklist (PodSpec patterns):**

| Field | Hardened value |
|---|---|
| `runAsNonRoot` | `true` |
| `readOnlyRootFilesystem` | `true` |
| `allowPrivilegeEscalation` | `false` |
| `capabilities.drop` | `["ALL"]` (add only what's required) |
| `seccompProfile.type` | `RuntimeDefault` |
| `securityContext.privileged` | `false` (default — never set true) |
| `automountServiceAccountToken` | `false` unless the pod actually calls the API |

**NetworkPolicy default-deny pattern (an exam staple):**

| Goal | Selector / Policy |
|---|---|
| Default deny ingress + egress in NS | `podSelector: {}` + `policyTypes: [Ingress, Egress]` (no rules = block all) |
| Allow ingress from one app | `from: [{ podSelector: { matchLabels: { app: web } } }]` |
| Allow egress to DNS | `to: [{ namespaceSelector: {}, podSelector: { matchLabels: { k8s-app: kube-dns } } }]` + ports `53/UDP` and `53/TCP` |
| Allow egress to specific external CIDR | `to: [{ ipBlock: { cidr: 10.0.0.0/8, except: [10.0.5.0/24] } }]` |

**Audit policy levels (most → least verbose):**

| Level | Captures |
|---|---|
| `RequestResponse` | Request body + response body |
| `Request` | Request body only |
| `Metadata` | Who, what, when (no body) |
| `None` | Skip |

**Supply-chain admission verification (cosign + Kyverno):**

| Step | Action |
|---|---|
| 1. Sign image | `cosign sign --key cosign.key registry/app:v1` |
| 2. Cluster policy | Kyverno `ClusterPolicy` with `verifyImages` rule referencing the public key |
| 3. Block on fail | `validationFailureAction: enforce` |
| 4. Audit signing record | Sigstore Rekor transparency log |

**Study path (60–100 hours if CKA-fresh):**

| Resource | Why |
|---|---|
| KodeKloud CKS (Mumshad) | Best paced video course |
| Linux Foundation CKS (official) | Free with exam, syllabus-aligned |
| killer.sh CKS | Two free attempts with the exam — harder than the real thing |
| "Kubernetes Security and Observability" book | Concept depth |
| Aqua Security K8s Security book (free PDF) | Reference |

**Cross-references in this corpus:**

- [devops/security/container_security_image_scanning_trivy_rootless_pss.md](../devops/security/container_security_image_scanning_trivy_rootless_pss.md)
- `devops/kubernetes/` — RBAC, probes, secrets cheatsheets

**Rule of thumb:** CKS is about *applying* tooling, not memorizing internals. **Master one policy engine — pick Kyverno over OPA/Gatekeeper** (less Rego, more YAML). **Default-deny NetworkPolicy** is the most-asked single pattern. **PSA at `restricted`** + drop-ALL caps + `runAsNonRoot` + `RuntimeDefault` seccomp is the boilerplate hardened PodSpec. The 40% supply-chain-and-runtime weight means cosign + Falco + audit policy must be muscle memory.
