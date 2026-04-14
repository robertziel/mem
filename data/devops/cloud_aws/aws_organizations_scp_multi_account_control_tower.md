### AWS Organizations & Control Tower

**AWS Organizations:**
- Centrally manage multiple AWS accounts
- Consolidated billing (one bill, volume discounts)
- Service Control Policies (SCPs) for guardrails

**Account structure:**
```
Management Account (root)
  └── OU: Production
  │     ├── Account: prod-app (123456789012)
  │     └── Account: prod-data (123456789013)
  └── OU: Staging
  │     └── Account: staging (123456789014)
  └── OU: Development
  │     └── Account: dev (123456789015)
  └── OU: Security
        ├── Account: audit (123456789016)
        └── Account: log-archive (123456789017)
```

**Why multi-account:**
- **Blast radius** — one compromised account doesn't affect others
- **Billing** — clear cost allocation per team/project
- **Compliance** — separate prod from dev (audit requirement)
- **Limits** — each account has its own service quotas

**Service Control Policies (SCPs):**
- Guardrails applied to OUs or accounts
- Define MAXIMUM permissions (even admin can't exceed)
- Do NOT grant permissions (only restrict)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyLeaveOrg",
      "Effect": "Deny",
      "Action": "organizations:LeaveOrganization",
      "Resource": "*"
    },
    {
      "Sid": "DenyRegionsOutsideAllowed",
      "Effect": "Deny",
      "NotAction": [
        "iam:*", "sts:*", "organizations:*", "support:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["us-east-1", "eu-west-1"]
        }
      }
    }
  ]
}
```

**Common SCPs:**
- Deny leaving the organization
- Restrict to approved regions only
- Prevent disabling CloudTrail/Config
- Deny root account usage
- Require encryption on S3/EBS
- Prevent public S3 buckets

**AWS Control Tower:**
- Automated multi-account setup with best practices
- Landing Zone: pre-configured multi-account environment
- Guardrails: preventive (SCPs) + detective (Config rules)
- Account Factory: self-service account creation with guardrails

**Control Tower landing zone includes:**
- Management account (billing, organizations)
- Audit account (cross-account security access)
- Log archive account (centralized CloudTrail, Config logs)
- SSO setup for centralized user access

**Cross-account access:**
```
Account A (app) needs to access S3 in Account B (data):
  1. Account B: create IAM role with trust policy allowing Account A
  2. Account A: assume role in Account B via sts:AssumeRole
  3. Use temporary credentials to access Account B's S3
```

**Rule of thumb:** Use Organizations for any company with more than one AWS workload. Separate prod/staging/dev into different accounts. SCPs for preventive guardrails. Control Tower for automated setup. Centralize logging in a dedicated account. At minimum: management + prod + staging + security accounts.
