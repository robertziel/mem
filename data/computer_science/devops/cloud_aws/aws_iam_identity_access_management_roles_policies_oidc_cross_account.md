### AWS IAM (Identity and Access Management)

**Core concepts:**
- **User** - person or service with long-term credentials
- **Group** - collection of users with shared policies
- **Role** - assumable identity with temporary credentials (preferred for services)
- **Policy** - JSON document defining permissions

**Policy structure:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "10.0.0.0/8"
        }
      }
    }
  ]
}
```

**Policy types (evaluated together):**
- **Identity-based** - attached to user/group/role
- **Resource-based** - attached to resource (S3 bucket policy, SQS queue policy)
- **Permission boundary** - maximum permissions an identity CAN have
- **SCP (Service Control Policy)** - organization-wide guardrails

**Policy evaluation logic:**
1. Default: deny everything
2. Evaluate all applicable policies
3. Explicit Deny always wins
4. If no explicit deny, check for Allow
5. If no Allow, implicit deny

**IAM Roles for services:**
```
EC2 instance -> Instance Profile (Role) -> Access S3
ECS task -> Task Role -> Access DynamoDB
Lambda -> Execution Role -> Access SQS
EKS pod -> IRSA (IAM Roles for Service Accounts) -> Access Secrets Manager
```

**Cross-account access:**
```
Account A: Role with trust policy allowing Account B
Account B: User/Role assumes Role in Account A via sts:AssumeRole
```

**Best practices:**
- Least privilege: start with zero permissions, add what's needed
- Use roles, not long-term access keys
- Enable MFA for console access
- Use IAM Access Analyzer to find unused permissions
- Rotate access keys if you must use them
- Use AWS Organizations + SCPs for multi-account governance
- Tag resources and use condition keys for attribute-based access

**OIDC federation (e.g., GitHub Actions):**
- GitHub Actions assumes an AWS role without storing AWS credentials
- Trust policy allows GitHub's OIDC provider
- Scoped to specific repo/branch

**Rule of thumb:** Use roles everywhere (never embed access keys in code). Least privilege always. Use permission boundaries in multi-team environments. OIDC for CI/CD auth.
