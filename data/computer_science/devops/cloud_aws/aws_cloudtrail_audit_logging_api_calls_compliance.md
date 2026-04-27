### AWS CloudTrail (Audit Logging)

**What CloudTrail does:**
- Records ALL AWS API calls (who did what, when, from where)
- Audit trail for security, compliance, and troubleshooting
- Enabled by default (90-day event history, free)

**What gets logged:**
```json
{
  "eventTime": "2024-01-15T10:30:00Z",
  "eventName": "TerminateInstances",
  "userIdentity": {
    "type": "AssumedRole",
    "arn": "arn:aws:sts::123:assumed-role/admin/alice",
    "principalId": "AROAEXAMPLE:alice"
  },
  "sourceIPAddress": "203.0.113.50",
  "requestParameters": {
    "instancesSet": { "items": [{ "instanceId": "i-abc123" }] }
  },
  "responseElements": { "instancesSet": { "items": [{ "instanceId": "i-abc123", "currentState": "shutting-down" }] } }
}
```

**Event types:**
| Type | What | Examples |
|------|------|---------|
| Management events | Control plane operations | CreateBucket, RunInstances, DeleteStack |
| Data events | Data plane operations | S3 GetObject/PutObject, Lambda Invoke |
| Insights events | Unusual API activity patterns | Spike in API calls, unusual errors |

**Trail configuration:**
```bash
# Create trail (send logs to S3 + CloudWatch Logs)
aws cloudtrail create-trail \
  --name my-trail \
  --s3-bucket-name my-cloudtrail-logs \
  --is-multi-region-trail \
  --enable-log-file-validation \
  --cloud-watch-logs-log-group-arn arn:aws:logs:... \
  --cloud-watch-logs-role-arn arn:aws:iam::123:role/cloudtrail-role

aws cloudtrail start-logging --name my-trail
```

**Key features:**
- **Multi-region trail** — logs from all regions in one place
- **Log file validation** — detect tampering (SHA-256 digest files)
- **Organization trail** — single trail for all accounts in AWS Organizations
- **S3 delivery** — long-term storage, query with Athena
- **CloudWatch integration** — real-time alerts on specific API calls

**Query with Athena (SQL on CloudTrail logs):**
```sql
SELECT eventtime, eventsource, eventname, useridentity.arn, sourceipaddress
FROM cloudtrail_logs
WHERE eventname = 'DeleteBucket'
  AND eventtime > '2024-01-01'
ORDER BY eventtime DESC;
```

**Common security queries:**
- Who deleted a resource? (`eventname = 'TerminateInstances'`)
- Unauthorized access attempts? (`errorcode = 'AccessDenied'`)
- Root account usage? (`useridentity.type = 'Root'`)
- API calls from unusual IP? (filter by `sourceipaddress`)
- Console logins without MFA? (`eventname = 'ConsoleLogin' AND additionaleventdata LIKE '%MFAUsed%No%'`)

**CloudTrail vs CloudWatch Logs vs Config:**
| Service | Answers |
|---------|---------|
| CloudTrail | Who did what? (API audit log) |
| CloudWatch Logs | What happened inside the app? (application logs) |
| AWS Config | What is the current state of resources? (configuration history) |

**Rule of thumb:** Enable multi-region trail with log file validation for every AWS account. Send to S3 for long-term retention, CloudWatch for real-time alerting. Query with Athena for investigations. CloudTrail is your "security camera" — always recording.
