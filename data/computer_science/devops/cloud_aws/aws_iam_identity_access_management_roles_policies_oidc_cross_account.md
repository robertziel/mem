### AWS IAM (Roles, Policies, OIDC, Cross-Account)

**Core principals:**

| Principal | What it is | Credentials |
|---|---|---|
| **Root account** | The original account owner | Long-lived; never use day-to-day; lock with hardware MFA |
| **IAM User** | Long-lived identity for a person or legacy service | Password and/or access key |
| **IAM Group** | Bag of users that shares policies | None (organizational) |
| **IAM Role** | Assumable identity — short-lived creds via STS | `AssumeRole` returns temp keys (15 min – 12 h) |
| **IAM Identity Center user** (formerly SSO) | Federated user from your IdP (Okta, Entra, Google) | Browser-issued role assumption |
| **Service-linked role** | Role AWS service creates and manages itself | AWS-managed |
| **Federated identity** (OIDC / SAML) | External IdP that assumes a role | OIDC ID token / SAML assertion → STS |

> **Modern best practice:** humans use **IAM Identity Center** (not IAM users), services use **roles**. IAM users with long-lived keys are a smell.

**Policy types — five sources of truth:**

| Type | Attached to | Effect |
|---|---|---|
| **Identity-based** | User / group / role | What the principal can do |
| **Resource-based** | Resource (bucket policy, SQS queue, KMS key, Lambda) | Who can act on this resource |
| **Permission boundary** | User or role | **Maximum** permissions — caps what identity-based grants |
| **SCP** (Service Control Policy) | OU / account in AWS Organizations | Org-wide cap; even root can't exceed |
| **Session policy** | Passed at `AssumeRole` time | Cap for this specific session |

**Policy evaluation — the deny-wins game:**

| Step | Rule |
|---|---|
| 1 | Implicit deny (default) |
| 2 | Evaluate all applicable policies |
| 3 | **Explicit `Deny` always wins** |
| 4 | If no Deny, an `Allow` from any source grants access |
| 5 | If no Allow, fall back to implicit deny |

**Policy evaluation crosses sources:**

| Cross-account access requires | Both must allow |
|---|---|
| Identity-based on caller | ✅ |
| Resource-based on target | ✅ |
| Trust policy on assumed role | ✅ |

**Policy document structure:**

| Field | Purpose |
|---|---|
| `Version` | Always `"2012-10-17"` |
| `Statement[]` | One or more statements (OR'd) |
| `Sid` | Optional ID for the statement |
| `Effect` | `Allow` / `Deny` |
| `Principal` | Who (only on resource-based) |
| `Action` / `NotAction` | API actions, e.g. `s3:GetObject` |
| `Resource` / `NotResource` | ARNs (`arn:aws:s3:::bucket/*`) |
| `Condition` | Constraints (see below) |

**Condition keys you'll actually use:**

| Key | Use |
|---|---|
| `aws:SourceIp` | Restrict by network CIDR |
| `aws:SourceVpc` / `aws:SourceVpce` | Only via specific VPC / endpoint |
| `aws:SecureTransport` | Force TLS — `Bool: true` |
| `aws:RequestedRegion` | Region allow-list |
| `aws:PrincipalOrgID` | Trust any account in our org |
| `aws:PrincipalTag/<Key>` | ABAC (attribute-based access) |
| `aws:RequestTag/<Key>` / `aws:ResourceTag/<Key>` | Tag-based scoping |
| `aws:MultiFactorAuthPresent` | Require MFA |
| `aws:CurrentTime` / `aws:TokenIssueTime` | Time-window restrictions |
| `s3:prefix` | Limit to a key prefix in a bucket |
| `kms:ViaService` | KMS key only via specific service |

**`Action` patterns:**

| Pattern | Meaning |
|---|---|
| `"s3:GetObject"` | Single action |
| `"s3:Get*"` | Wildcard |
| `["s3:GetObject", "s3:PutObject"]` | List |
| `"NotAction": ["iam:*", "sts:*"]` | Everything except these (use sparingly) |

**Resource ARNs:**

| Service | Pattern |
|---|---|
| S3 bucket | `arn:aws:s3:::my-bucket` |
| S3 object | `arn:aws:s3:::my-bucket/path/*` |
| DynamoDB table | `arn:aws:dynamodb:us-east-1:123:table/Orders` |
| Specific KMS key | `arn:aws:kms:us-east-1:123:key/abcd-...` |
| Lambda function | `arn:aws:lambda:us-east-1:123:function:my-fn` |
| IAM role | `arn:aws:iam::123:role/Deployer` |
| Wildcard within a service | `arn:aws:s3:::*` |

**Roles for services — match to the runtime:**

| Service | Identity mechanism |
|---|---|
| EC2 | Instance profile attaches a role |
| ECS / Fargate | **Task role** (your app) + **execution role** (the agent: pull images, fetch secrets) |
| Lambda | Execution role |
| EKS pod | **IRSA** (IAM Roles for Service Accounts) — OIDC trust to cluster's IDP |
| EKS pod (newer) | **Pod Identity** — agent-injected creds, simpler than IRSA |
| Step Functions / Glue / Batch | Service-specific role |
| Cross-account | Role with trust policy + caller does `sts:AssumeRole` |

**Trust policy — who can assume the role:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::222222222222:role/CI" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "<unique-shared-secret>" }
    }
  }]
}
```

| Pattern | Use |
|---|---|
| `Principal: { AWS: <role-arn> }` | Cross-account specific role |
| `Principal: { AWS: arn:aws:iam::<acct>:root }` + `aws:PrincipalArn` condition | Whole account, then narrow |
| `Principal: { Federated: <oidc-arn> }` + `Condition: StringEquals: <claim>` | OIDC federation (GitHub, GitLab, K8s) |
| `Principal: { Service: ec2.amazonaws.com }` | AWS service (EC2, Lambda, ECS) |
| `sts:ExternalId` condition | Required for **third-party** cross-account roles (confused-deputy fix) |

**Cross-account access pattern:**

| Step | What |
|---|---|
| 1 | Account B creates a role with trust policy allowing Account A's principal |
| 2 | Attach least-privilege permissions policy to B's role |
| 3 | A's principal calls `sts:AssumeRole` against B's role ARN |
| 4 | A receives temporary credentials valid for the requested duration |
| 5 | A uses those creds to call B's APIs |

> **Use `aws:PrincipalOrgID` condition** to scope to "any principal in our org" without listing every account.

**OIDC federation — the modern way to authenticate CI / external workloads:**

| Provider | Setup |
|---|---|
| **GitHub Actions** | OIDC issuer `token.actions.githubusercontent.com`; trust by `repo:org/repo:ref:branch` |
| **GitLab** | Similar OIDC issuer, trust by project / ref |
| **Bitbucket Pipelines** | Similar |
| **Kubernetes (IRSA)** | Cluster's OIDC issuer; service account → role mapping |
| **Terraform Cloud / HCP** | OIDC trust with workspace claims |
| **Argo Workflows** / Tekton | Same pattern |

**GitHub Actions OIDC trust policy — the canonical shape:**

```json
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::123:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals":   { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
    "StringLike":     { "token.actions.githubusercontent.com:sub": "repo:my-org/my-repo:ref:refs/heads/main" }
  }
}
```

> **Eliminates static AWS keys in CI** — temporary creds, scoped to a repo + branch.

**Permission boundaries — capping delegated admins:**

| Concept | Detail |
|---|---|
| Boundary | Policy that limits **maximum** permissions an identity can have |
| Use | Letting an app team's lead create roles, but only within a sandbox |
| Effect | Effective permissions = `identity_policy ∩ boundary` |
| Without boundaries | Delegated admins can grant themselves anything |

**SCPs (org-level guardrails) — see also `aws_organizations_*.md`:**

| SCP | Effect |
|---|---|
| Region allow-list | Deny everything outside approved regions |
| Deny disabling CloudTrail / Config / GuardDuty | Closes audit blinding |
| Deny IAM user creation in workload accounts | Force SSO + roles |
| Require encryption | Deny `s3:PutObject` without `aws:RequestObjectEncryption` |
| Deny root usage | Force role assumption |

**Tools for least privilege:**

| Tool | What it does |
|---|---|
| **IAM Access Analyzer** | Identifies unused permissions, external access, custom policy generation from CloudTrail |
| **CloudTrail** | Audit log of every API call |
| **Service Last Accessed** info | Which services has this role used recently? |
| **AccessAdvisor** | Trim down policies based on what's actually used |
| **Policy simulator** | Test what an identity can or can't do |
| **iamlive** | Generates a least-privilege policy from observed CLI calls |

**Common patterns and idioms:**

| Pattern | Use |
|---|---|
| **AssumeRole chain** | Account A → assume → Account B → assume → Account C |
| **Confused-deputy guard** | `sts:ExternalId` for cross-tenant roles |
| **Service-linked role** | AWS creates and maintains; you can't edit it |
| **Console-only access role** | `Condition: aws:CalledVia` excludes programmatic |
| **Read-only audit role** | `arn:aws:iam::aws:policy/SecurityAudit` (managed policy) |
| **Break-glass role** | High privileges, MFA-required, alert on every assumption |
| **Tag-based access (ABAC)** | Match `aws:PrincipalTag/Project` to `aws:ResourceTag/Project` |

**ABAC (attribute-based) example:**

```json
{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "aws:ResourceTag/Project": "${aws:PrincipalTag/Project}"
    }
  }
}
```

> Engineer with `Project=Foo` tag can act on resources tagged `Project=Foo` — scales linearly with team without exploding policy count.

**Anti-patterns / pitfalls:**

| Pitfall | Effect |
|---|---|
| Long-lived access keys committed to git | Major incident — rotate + audit immediately |
| Wildcard `Action: "*"` + `Resource: "*"` | Effective root |
| `iam:PassRole: "*"` | Privilege escalation — anyone can pass any role |
| Trust policy allowing whole account without conditions | Any role in that account can assume you |
| Forgetting `sts:ExternalId` for third-party trust | Confused-deputy attack vector |
| Using IAM users for CI | Use OIDC instead — no stored secrets |
| Inline policies sprawled everywhere | Audit nightmare; use managed policies + boundaries |
| Missing region restrictions | Resources spawn in unintended regions |
| `NotAction` lists that grow forever | One day a new service is missed |
| Permission boundary only on some roles | Inconsistent guardrails |
| Sharing IAM users between humans | No audit; can't revoke individually |

**Rotation / hygiene checklist:**

| Check | Pass? |
|---|---|
| MFA enforced on all human IAM Identity Center logins | ✅ |
| No long-lived AWS access keys in CI (use OIDC) | ✅ |
| Roles + permission boundaries for delegated admins | ✅ |
| SCPs at org level for region + audit guardrails | ✅ |
| Least-privilege policies generated from real usage (Access Analyzer / iamlive) | ✅ |
| No wildcard `iam:PassRole` | ✅ |
| External access reviewed (Access Analyzer findings: 0) | ✅ |
| Break-glass role logged + alerted on every use | ✅ |

**Rule of thumb:** **roles, not users.** Humans federate via **IAM Identity Center**; services use **roles** (instance profile / task role / execution role / IRSA / Pod Identity); CI uses **OIDC** with no stored AWS keys. **Permission boundaries** for delegated admins, **SCPs** for org-wide guardrails, **explicit `Deny` always wins**. **Least privilege from day one** — and use Access Analyzer to keep it that way.
