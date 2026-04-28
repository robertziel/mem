### GDPR / CCPA — Data Governance, PII, Compliance (data subject rights, lawful basis)

**When:** any product processing **personal data** of EU residents (GDPR), California residents (CCPA/CPRA), or other regulated populations (LGPD Brazil, PIPEDA Canada, etc.). Knowing the basics is **legally required**, not optional, for any DS / data engineer touching production data.

**Schema (the regulatory landscape):**

| Regulation | Jurisdiction | Year | Penalties |
|---|---|---|---|
| **GDPR** | EU + EEA + UK (post-Brexit) | 2018 | Up to €20M or 4% global revenue |
| **CCPA / CPRA** | California | 2020 / 2023 | Up to $7,500 per intentional violation |
| **LGPD** | Brazil | 2020 | Up to 2% revenue |
| **PIPEDA** | Canada | 2001 | Modest fines |
| **HIPAA** | US healthcare | 1996 | Per-violation tiers |
| **COPPA** | US children online | 1998 | Up to $50K per violation |
| **PIPL** | China | 2021 | Up to 5% revenue |

> **GDPR is the de facto global standard**. Even non-EU companies usually comply because EU users / business is everywhere.

#### What counts as "personal data"

| Definition | Examples |
|---|---|
| **GDPR**: any info relating to identified or identifiable natural person | Name, email, phone, IP, device ID, location, photo, biometric, health, opinions |
| **Pseudonymized but reversible** | Still personal data |
| **Truly anonymized** | NOT personal data |
| **Aggregate stats** | Usually not personal (depends on cell size) |

> If you can re-identify, it's personal data. Conservative approach.

#### GDPR's seven principles (Article 5)

| Principle | Detail |
|---|---|
| **Lawfulness, fairness, transparency** | Must have legal basis; clear to user |
| **Purpose limitation** | Use only for the purpose collected |
| **Data minimization** | Collect only what's needed |
| **Accuracy** | Keep current; rectify wrong data |
| **Storage limitation** | Don't keep longer than needed |
| **Integrity and confidentiality** | Secure (encryption, access control) |
| **Accountability** | Demonstrate compliance |

#### Lawful bases (Article 6) — pick at least one

| Basis | When |
|---|---|
| **Consent** | User explicitly opts in (clear, granular, revocable) |
| **Contract** | Necessary to perform a contract with the user |
| **Legal obligation** | Compliance with law (tax, anti-money-laundering) |
| **Vital interest** | Life-or-death situations |
| **Public task** | Government / official authority |
| **Legitimate interest** | Balance between business and individual |

> **Document which basis applies for each processing purpose**. Required for accountability.

#### Special categories (Article 9 — extra protection)

| Category | Examples |
|---|---|
| Racial / ethnic origin | |
| Political opinions | |
| Religious / philosophical beliefs | |
| Trade union membership | |
| Genetic / biometric data | Including face / fingerprint for ID |
| Health data | |
| Sex life / sexual orientation | |

> Processing these requires **explicit consent** or specific exemption.

#### Data subject rights (Articles 15–22)

| Right | Detail |
|---|---|
| **Access** (Art 15) | Get a copy of their data + how it's used |
| **Rectification** (Art 16) | Fix inaccurate data |
| **Erasure / "right to be forgotten"** (Art 17) | Delete their data (with exceptions) |
| **Restriction** (Art 18) | Stop processing pending dispute |
| **Portability** (Art 20) | Get data in machine-readable format |
| **Object** (Art 21) | Stop direct marketing, etc. |
| **Automated decision-making** (Art 22) | Right to human review of automated decisions with significant effects |

> **Build self-service tooling** for these rights. Manual fulfillment doesn't scale.

#### Implementation checklist for ML systems

| Concern | Action |
|---|---|
| **Data inventory** | Know what PII you collect, where stored, who can access |
| **Privacy notice** | Clear, plain-language description of data use |
| **Consent management** | Capture, store, honor, revoke; granular per purpose |
| **Right to erasure** | Be able to delete a user's data — including from features, models, backups |
| **Data Subject Access Request (DSAR)** | Build self-service portal |
| **Data minimization** | Collect only fields actually used by features / model |
| **Storage limitation** | Set retention policies; auto-delete after N years |
| **Cross-border transfer** | EU → US needs SCCs (Standard Contractual Clauses) or adequacy |
| **Sub-processors** | Vet vendors; have DPAs (Data Processing Agreements) |
| **Breach notification** | 72 hours to notify regulator (GDPR); user notification depends on risk |
| **DPIA (Data Protection Impact Assessment)** | For high-risk processing (large-scale profiling, automated decisions) |
| **Data Protection Officer (DPO)** | Required for some orgs |
| **Privacy by design** | Anonymize / aggregate by default |

#### Right-to-be-forgotten in ML

When a user requests deletion:

| Layer | Action |
|---|---|
| **Raw data** | Delete from data warehouse / lake |
| **Backups** | Either delete from backups or set policy |
| **Feature store** | Delete user's features |
| **Cache** | Invalidate |
| **Model training data** | Hard problem — see machine unlearning |
| **Model itself** | If model "memorized" — retrain or apply machine unlearning |
| **Logs** | Delete or anonymize |
| **Analytics aggregates** | Usually not in scope (true anonymization) |
| **Backups beyond retention** | Document timeline |

> "Machine unlearning" is an active research area. Practical approach: **periodic retraining with current data**, sometimes called "scheduled forgetting".

#### CCPA / CPRA differences from GDPR

| Aspect | GDPR | CCPA / CPRA |
|---|---|---|
| Lawful basis required | Yes | No (opt-out model) |
| Scope | Everyone in EU | California residents |
| Fines | 4% global revenue / €20M | Up to $7,500 per intentional violation |
| Right to know | Yes | Yes |
| Right to delete | Yes | Yes |
| Right to portability | Yes | Yes (CPRA) |
| Right to opt out of sale | — | **Yes** (and "share") |
| Right to opt out of automated decisions | Yes | CPRA: limited |
| Sensitive data | Special categories | "Sensitive personal information" (CPRA) |

#### Cookie consent (ePrivacy + GDPR)

For EU sites:

| Requirement | Detail |
|---|---|
| Strictly necessary cookies | No consent needed |
| Analytics / marketing | **Opt-in consent** (not opt-out) |
| Third-party trackers | Granular consent per purpose |
| Refuse as easy as accept | New rule — no "dark patterns" |

> Use a consent management platform (CMP): OneTrust, Cookiebot, Iubenda, etc.

#### Cross-border data transfer (post-Schrems II)

| Mechanism | Status |
|---|---|
| **Adequacy decision** | EU + UK + Canada + Japan + few others |
| **Standard Contractual Clauses (SCCs)** | Most common for non-adequate countries |
| **Binding Corporate Rules (BCRs)** | Enterprise alternative |
| **Privacy Shield** | Invalidated 2020 |
| **EU-US Data Privacy Framework (DPF)** | Successor (2023) — companies self-certify |
| **Derogations** | Limited (consent, contract, vital interest) |

> EU → US transfers need **SCCs + Transfer Impact Assessment** (TIA), or DPF certification.

#### Data Processing Agreement (DPA)

When using a vendor as a processor (cloud provider, analytics tool):

| Required clause | Detail |
|---|---|
| Subject matter & duration | What's processed, how long |
| Nature & purpose | Why it's processed |
| Type of data + categories of subjects | What kinds of data |
| Controller obligations | Your responsibilities |
| Processor obligations | Vendor's responsibilities |
| Sub-processor approval | Listing + change notification |
| Security measures | Technical + organizational |
| Audit rights | You can audit them |
| Breach notification timelines | E.g., within 24 hours |
| Data return / deletion at end | What happens when contract ends |
| International transfer mechanism | SCCs etc. |

#### Common DS / ML pitfalls

| Mistake | Fix |
|---|---|
| Training on PII without consent | Use lawful basis; minimize |
| Sharing models that memorize PII | Use DP-SGD or larger batches |
| "Anonymized" data that's actually pseudonymized | Use real anonymization techniques |
| Logging full PII in production | Mask / hash; aggregate |
| Reusing data for new purpose without notice | Update privacy notice; re-obtain consent if material |
| No retention policy | Set TTL on PII; auto-delete |
| Cross-border training without SCCs | Audit vendors; sign agreements |
| Consent recorded once, never refreshed | Re-prompt periodically; honor revocation |
| Backups not in deletion scope | Set backup retention; or include in DSAR fulfillment |
| ML models in scope of "automated decision-making" Art 22 | Add human review path |

#### Privacy-by-design patterns

| Pattern | Detail |
|---|---|
| Hash + salt PII for ID-only joins | Stable hash, no reverse |
| Tokenize PII at ingestion | Original kept in vault |
| Aggregate at point of collection | Reduce identifiability |
| Differential privacy on dashboards | Bounded leakage |
| Federated learning across orgs | No central data |
| Per-user encryption | Each user has unique key |
| Time-bounded retention | Auto-delete |
| Minimize feature set | Don't store fields you don't use |

#### DSAR (Data Subject Access Request) — implementing

```
Required response:
- Confirmation: Do we process their data?
- Categories of data + sources
- Purposes of processing
- Recipients (vendors, partners) of their data
- Retention periods (or how determined)
- Their rights (rectification, erasure, etc.)
- Right to lodge complaint with supervisory authority
- For automated decisions: logic involved + significance / consequences

Format: usually in 30 days, free; machine-readable for portability.
```

> Build a **self-service DSAR portal**. Manual processes don't scale and risk missing the 30-day deadline.

#### Industry-specific overlays

| Industry | Additional regs |
|---|---|
| Healthcare | HIPAA (US), MHRA (UK) |
| Finance | PCI-DSS, GLBA, BSA |
| Children | COPPA (US), GDPR-K (under-16 EU) |
| Education | FERPA (US) |
| Telecom | ePrivacy Directive (EU) |
| Defense / gov | ITAR, FedRAMP |

#### Documentation / audit trails

| Document | Required |
|---|---|
| **Privacy notice** | Public — what you do |
| **Records of processing** (Art 30) | Internal — what / why / who / how long |
| **DPIA** | For high-risk processing |
| **Consent records** | When given, what for, how to revoke |
| **DPA** with each processor | Per-vendor contracts |
| **Breach register** | Even if not reported |
| **Training logs** | Staff trained on data protection |

#### Tools

| Tool | Use |
|---|---|
| **OneTrust / TrustArc / Iubenda / Cookiebot** | Consent management |
| **BigID / OneTrust DataDiscovery / DataGrail** | PII discovery |
| **Privitar / DataMasque** | Tokenization, masking |
| **Egnyte / Varonis** | Data access governance |
| **Skyflow** | PII vault as a service |
| **Snorkel / Trifacta** | Data prep with masking |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Treating compliance as legal-only problem | Engineering / DS must be involved |
| Reusing data for new purposes | Document; refresh consent / re-evaluate basis |
| Training ML on user data without notice | Update privacy notice; consider DP |
| No retention policy | Auto-expire; document why if extended |
| Backups outside DSAR scope | Document policy; include or schedule |
| Ignoring sub-processors | Vet; sign DPAs; track |
| Processing children's data without parental consent | Age gate; consent flows |
| Profiling for ad targeting | Often special-category; explicit consent |

#### Decision: do I need to comply?

```
Subject to GDPR if:
├─ EU establishment offering goods/services         → Yes
├─ Process EU residents' data (regardless of where) → Yes
└─ Otherwise                                          → No

Subject to CCPA if:
├─ Do business in California AND
│   ├─ > $25M revenue, OR
│   ├─ Buy / sell / share PII of > 100K Californians, OR
│   └─ > 50% revenue from selling / sharing PII
└─ Yes

Subject to HIPAA?
└─ "Covered entity" or "business associate" handling PHI
```

**Rule of thumb:** **GDPR is the global default**. Map every processing operation to a **lawful basis**. **Build self-service** for data subject rights — DSARs, deletion, portability. **Minimize what you collect** and **set retention limits**. **Cross-border transfer** needs SCCs / DPF / adequacy. **ML models can leak training data** — use DP-SGD or larger batches; deletion must include features and model artifacts. Compliance is **engineering work**, not just legal.
