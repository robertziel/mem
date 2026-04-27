### PQC Migration Checklist — Discover, Inventory, Pilot, Roll, Sunset

**What it is:**
The five-phase pattern for taking an organization from classical-only crypto to hybrid / PQ without downtime or a last-minute scramble. The phases overlap in time but not in responsibility — each has different owners, exit criteria, and common failure modes.

**Threat the program addresses:**
Both HNDL (channel confidentiality) and authentication forgery. The program's job is to shrink `Y` (migration time) in the Mosca inequality so `X + Y < Z`.

**The five phases at a glance:**
| Phase | Owner | Exit criterion | Typical duration |
|---|---|---|---|
| 1. Discover | Security + each app team | Every service emits a CBOM in CI | 1-3 quarters |
| 2. Inventory & prioritize | Security architecture | Ranked migration backlog w/ data-sensitivity score | 1-2 quarters |
| 3. Pilot | Selected app team + platform | Hybrid KEM live on one real service; metrics collected | 1-2 quarters |
| 4. Roll | App teams, platform, CA ops | N% of fleet on hybrid; fallback rate < threshold | multiple quarters |
| 5. Sunset | Security + ops | Classical-only refused at policy enforcement point | trailing quarter(s) |

**Phase 1 — Discover:**
- Generate a CBOM for each service (AST scan + binary scan + runtime hook).
- Scrape PKI: enumerate every cert, signing key, KMS entry.
- Find the long tail: vendor appliances, firmware update flows, embedded devices, legacy batch jobs.
- **Stakeholders:** application teams own "what crypto does my service call?"; security owns the aggregation and schema.
- **Failure mode:** security tries to do the discovery alone, misses 40% of actual usage, and discovers it during pilot instead.

**Phase 2 — Inventory & prioritize:**
- Join CBOM data with data-sensitivity and retention tables.
- Score each service: `risk = sensitivity × retention_years × (1 if quantum_vulnerable else 0)`.
- Split into cohorts: HNDL-critical (score > threshold) goes in the first rollout wave; transient-data services can wait for library maturity.
- **Stakeholders:** data-governance / privacy team gates the sensitivity scoring; security owns the ranking.
- **Failure mode:** treating every service as equally urgent and overwhelming the platform team.

**Phase 3 — Pilot:**
- Pick one HNDL-critical service and one low-risk service. Enable hybrid on both.
- Choose by failure cost: low-blast-radius first, high-value shortly after.
- Collect: handshake latency delta, failure rate, packet-size issues, library bugs, HSM support gaps.
- **Stakeholders:** a volunteer app team; platform SRE; library owners (OpenSSL / BoringSSL version bump).
- Draft the runbook: what does "fallback to classical" mean, who silences the alert, who rolls back.
- **Failure mode:** pilot on a greenfield service that shares no code with production; learnings don't transfer.

**Phase 4 — Roll:**
- Drive the ranked backlog. Track fleet-wide progress on one dashboard.
- Cert-issuance pipelines move to dual-sig; internal mTLS fleet upgrades first.
- At-rest KEK re-wrap jobs run continuously in the background.
- **Stakeholders:** each app team runs the deployment; platform owns the library/HSM firmware; CA ops owns the dual-sig root; SRE owns the monitoring.
- **Failure mode:** no enforcement — a team "opts out" and is never revisited.

**Phase 5 — Sunset:**
- Policy engine refuses classical-only at the enforcement point (load balancer, KMS policy, CA issuance policy).
- Deprecate (can't issue, can still verify) → forbid (can't verify).
- Decommission old roots; clean up expired CRLs and OCSP signers.
- **Stakeholders:** security enforcement team + ops.
- **Failure mode:** skipping this phase. A 90%-migrated fleet is worth no more than its weakest peer for a confidentiality adversary.

**Example enforcement snippet (policy-as-code):**
```yaml
# policy: refuse classical-only TLS for HNDL-tagged services
rules:
  - id: require-hybrid-kem
    match:
      service.tags: ["hndl-sensitive"]
    deny:
      tls.negotiated_group:
        not_in: [X25519MLKEM768, SecP256r1MLKEM768, X25519Kyber768Draft00]
    on_violation:
      action: alert
      severity: high
      reviewer: security-architecture
```

**Timeline pattern (generic, not dates):**
```
Discover   [##########]
Inventory        [########]
Pilot                 [######]
Roll                       [##########################]
Sunset                                         [############]
```
Phases overlap; Discover never truly ends (it becomes a CI rule).

**Common failure modes across the whole program:**
- **Crypto-agility debt**: teams migrate by forking algorithm strings through 200 files instead of routing through a suite registry; next migration repeats the work.
- **Pinning in mobile clients**: leaf-cert pins in app binaries that won't accept a rotated PQ key until next app-store release.
- **Forgotten internal CA**: an offline root nobody owns, signing infrastructure certs that outlive everyone's laptop.
- **HSM firmware gap**: vendors late to ML-DSA; migration blocks on a procurement ticket.
- **Test-plan myopia**: performance tested at p50 but not p99; oversized ClientHello tail-latencies surface under load.
- **Monitoring blind spot**: fallback-to-classical succeeds silently; dashboard shows green while protection evaporates.
- **Key-reuse** across classical and PQ — generate fresh material at every suite transition.

**Roles RACI (condensed):**
| Task | Security | App team | Platform/SRE | CA ops | Ops/Net |
|---|---|---|---|---|---|
| CBOM generation | A | R | C | I | I |
| Pilot execution | C | R | R | I | C |
| Dual-sig CA rollout | A | I | C | R | C |
| Library/HSM upgrade | C | I | R | C | I |
| Enforcement policy | R/A | I | C | I | C |

**Rule of thumb:** Discover before you pilot, pilot before you roll, enforce before you sunset — skip any phase and the migration becomes a decade-long retrospective instead of a one-year program.
