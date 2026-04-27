### AWS Organizations, SCPs & Control Tower (Multi-Account Strategy)

**Why multi-account at all:**

| Driver | What it gives you |
|---|---|
| **Blast radius** | One account compromised → others unaffected |
| **Billing clarity** | Clean cost allocation per team / product / env |
| **Compliance** | Prod ↔ non-prod separation (SOC2, HIPAA, PCI) |
| **Service quotas** | Each account has its own limits — you escape "noisy neighbor" |
| **IAM simplicity** | Cross-account boundaries replace fragile per-resource policies |
| **Account-level audit** | One CloudTrail trail per account, one log destination |

**Recommended OU layout (the "Landing Zone" shape):**

```
Management (root, billing only)
├── Security OU
│   ├── audit          ← cross-account read for security tooling
│   └── log-archive    ← centralized CloudTrail / Config logs
├── Sandbox OU
│   └── per-developer  ← short-lived experiments
├── Production OU
│   ├── prod-app
│   └── prod-data
├── Pre-production OU
│   ├── staging
│   └── qa
└── Shared Services OU
    └── shared-network ← Transit Gateway, DNS, identity
```

**Account roles — what each one is for:**

| Account | Holds | Why isolated |
|---|---|---|
| Management (payer) | Organizations, billing, SCPs | Lock down hard — never deploy workloads here |
| Audit | Security tooling cross-account roles | Read-only access to all accounts; compromise here is contained |
| Log archive | Centralized CloudTrail + Config + ALB logs | Write-once log store; immutable bucket |
| Prod-app | Application workloads | Strictest SCPs; no dev access |
| Prod-data | Data stores (RDS, S3 lakes) | Even tighter than prod-app; data-class boundary |
| Staging | Production-like, lower scale | Same architecture as prod, smaller |
| Dev / sandbox | Engineer experimentation | Liberal SCPs but cost caps; disposable |
| Shared services | Transit Gateway, Route 53, IAM Identity Center, KMS keys | One copy serves all accounts |

**Service Control Policies (SCPs) — the rules:**

| Property | What it means |
|---|---|
| Scope | OUs or individual accounts |
| Effect | Define **maximum** permissions — even root can't exceed |
| **Never grants** | SCPs only restrict; you still need IAM policies for grants |
| Inheritance | SCPs at OU level apply to every account in the OU + its children |
| Default | New OU has `FullAWSAccess` — open until you tighten |
| Doesn't affect | Service-linked roles, AWS-managed master account, root account session control |

**SCPs you almost always want:**

| SCP | Effect |
|---|---|
| Deny leaving the org | `organizations:LeaveOrganization` blocked |
| Region allow-list | Deny everything not in `us-east-1`, `eu-west-1` (etc.) — except global services like IAM, STS, Organizations, Support |
| Deny disabling CloudTrail / Config / GuardDuty / SecurityHub | Closes the audit-blinding attack |
| Deny root-account usage | Force role assumption |
| Require encryption (S3, EBS, RDS) at rest | `s3:PutObject` denied unless `aws:RequestObjectEncryption` set |
| Block public S3 / public AMIs | Prevent accidental data exposure |
| Restrict IAM user creation in workload accounts | Force SSO + role-based access |
| Tag-based resource access | Deny actions on resources without required tags |

**SCP shape (deny-by-region with global allow-list):**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyOutsideAllowedRegions",
    "Effect": "Deny",
    "NotAction": ["iam:*", "sts:*", "organizations:*", "support:*", "cloudfront:*", "route53:*"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": { "aws:RequestedRegion": ["us-east-1", "eu-west-1"] }
    }
  }]
}
```

**Control Tower — what it actually does:**

| Component | Role |
|---|---|
| **Landing Zone** | Pre-built multi-account skeleton (Management, Audit, Log Archive, OUs) |
| **Account Factory** | Self-service account creation with default guardrails applied |
| **Guardrails** (preventive) | SCPs auto-attached to OUs |
| **Guardrails** (detective) | AWS Config rules that flag drift |
| **Centralized identity** | IAM Identity Center (SSO) federation by default |
| **Customizations** (CfCT) | CloudFormation extensions per account creation |

> **Control Tower vs roll-your-own:** Control Tower is opinionated and removes a lot of the toil. Roll your own (with `aws-organizations`/Terraform) when you need custom audit/log topology or already have an IaC-first culture.

**Identity options for human access:**

| Option | Use case |
|---|---|
| **IAM Identity Center (SSO)** | **Default** — federate from Okta/Entra/Google, assume roles via portal |
| Direct IAM users in workload accounts | Avoid — hard to rotate, no MFA enforcement at the IdP level |
| External IdP via SAML to one account, then `AssumeRole` chain | Legacy pattern; SSO replaces it |
| Root account | **Only** for billing setup, account closure — never for daily work |

**Cross-account access pattern:**

| Step | Action |
|---|---|
| 1 | In **target account B**, create an IAM role with a trust policy allowing **account A** (or its specific role) |
| 2 | Attach least-privilege permissions policy to that role |
| 3 | In **source account A**, the principal calls `sts:AssumeRole` against B's role ARN |
| 4 | Use returned **temporary credentials** to call B's APIs |

> Use **`aws:PrincipalOrgID`** condition in trust policies to scope to "any account in our org" without listing each ARN.

**Cost & billing:**

| Knob | Effect |
|---|---|
| Consolidated billing | One invoice; volume discounts pooled across accounts |
| Cost allocation tags | Activate tags org-wide; show in Cost Explorer |
| AWS Budgets per account | Per-team / per-env spend alerts |
| Reserved Instance / Savings Plan sharing | Default ON across the org — disable per account if you need isolation |

**Pitfalls:**

| Pitfall | Why it bites |
|---|---|
| Workloads in the management account | Compromise = compromise of the whole org |
| No region allow-list | Engineers create resources in unintended regions; cost + compliance creep |
| SCPs that deny everything except a list | Easy to forget a service; new releases blocked silently |
| SCPs without `NotAction` carve-outs for global services | IAM / STS / Organizations break under region restrictions |
| Direct IAM users instead of SSO | MFA fragmented, rotation is manual, ex-employee tokens linger |
| One account per microservice | Goes too far — Organizations limits, IAM cross-account complexity |
| No log archive | Compromised account can wipe its own CloudTrail; centralize to a different account |

**Rule of thumb:** **multi-account from day two**, not day 50. Start with **management + prod + non-prod + security (audit + log archive)** as the minimum. **SCPs for preventive guardrails** (region allow-list, no public S3, no disabling audit), **Config rules for detective**. **IAM Identity Center** for human access; assume-role for cross-account. **Control Tower if you don't already have IaC for org setup** — otherwise build with Terraform / `aws-organizations`.
