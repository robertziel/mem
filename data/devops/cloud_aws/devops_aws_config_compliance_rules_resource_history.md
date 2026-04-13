### AWS Config (Resource Compliance)

**What AWS Config does:**
- Continuously tracks resource configurations and changes over time
- Evaluates resources against compliance rules
- Answers: "What does my infrastructure look like NOW?" and "What CHANGED?"

**Key concepts:**
- **Configuration recorder** — records resource configurations
- **Configuration items** — point-in-time snapshot of a resource's config
- **Config rules** — desired configuration, evaluated continuously
- **Conformance packs** — collection of rules (compliance frameworks)

**Managed rules (pre-built, 300+):**
| Rule | Checks |
|------|--------|
| `s3-bucket-public-read-prohibited` | No public S3 buckets |
| `encrypted-volumes` | All EBS volumes encrypted |
| `rds-multi-az-support` | RDS instances have Multi-AZ |
| `iam-root-access-key-check` | Root account has no access keys |
| `restricted-ssh` | No SSH (port 22) open to 0.0.0.0/0 |
| `required-tags` | Resources have required tags (Environment, Owner) |
| `cloudtrail-enabled` | CloudTrail is enabled |

**Custom rules (Lambda-based):**
```python
# Lambda evaluates compliance
def lambda_handler(event, context):
    config = boto3.client('config')
    configuration_item = event['configurationItem']

    # Check if instance type is allowed
    allowed_types = ['t3.micro', 't3.small', 't3.medium']
    compliant = configuration_item['configuration']['instanceType'] in allowed_types

    config.put_evaluations(
        Evaluations=[{
            'ComplianceResourceType': configuration_item['resourceType'],
            'ComplianceResourceId': configuration_item['resourceId'],
            'ComplianceType': 'COMPLIANT' if compliant else 'NON_COMPLIANT',
            'OrderingTimestamp': configuration_item['configurationItemCaptureTime']
        }],
        ResultToken=event['resultToken']
    )
```

**Remediation (auto-fix non-compliant resources):**
```
Rule: s3-bucket-public-read-prohibited
  → Non-compliant → Auto-remediation → SSM Automation document
  → Removes public access from bucket automatically
```

**Resource timeline:**
```
View any resource's configuration history:
  EC2 instance i-abc123:
    2024-01-10: Created (t3.micro, sg-123)
    2024-01-15: Security group changed to sg-456
    2024-01-20: Instance type changed to t3.large
    2024-02-01: Terminated
```

**Conformance packs (compliance frameworks):**
- AWS Operational Best Practices for PCI DSS
- AWS Operational Best Practices for HIPAA
- AWS Operational Best Practices for CIS Benchmarks
- Custom packs for your organization's standards

**AWS Config vs CloudTrail vs CloudWatch:**
| Service | What | When to use |
|---------|------|-------------|
| Config | Resource configuration state + compliance | "Are my resources compliant?" |
| CloudTrail | API call audit log | "Who changed this?" |
| CloudWatch | Metrics, logs, alarms | "Is it performing well?" |

**Rule of thumb:** Enable Config in every account for compliance visibility. Start with managed rules for common checks (public S3, encryption, tagging). Use conformance packs for regulatory compliance (PCI, HIPAA). Config answers "what IS the state" while CloudTrail answers "who CHANGED the state."
