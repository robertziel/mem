### CloudWatch: Metrics & Alarms

**What CloudWatch does:**
- Monitoring and observability for AWS resources and applications
- Metrics, alarms, logs, dashboards, events -- all in one service

**Metrics:**
- Auto-collected for AWS services (EC2 CPU, RDS connections, ALB latency)
- Custom metrics: publish your own via API/SDK
- Namespace: `AWS/EC2`, `AWS/RDS`, `Custom/MyApp`
- Resolution: standard (1 min), high-res (1 sec, costs more)

**Key default metrics:**
| Service | Metric | What it tells you |
|---------|--------|------------------|
| EC2 | CPUUtilization | CPU load (%) |
| EC2 | StatusCheckFailed | Instance health |
| RDS | DatabaseConnections | Active DB connections |
| RDS | FreeStorageSpace | Disk running low? |
| ALB | TargetResponseTime | Backend latency |
| ALB | HTTPCode_Target_5XX | Backend error rate |
| Lambda | Duration | Execution time |
| Lambda | Errors | Invocation failures |
| SQS | ApproximateNumberOfMessagesVisible | Queue depth |

**Missing by default:** Memory and disk usage on EC2 (need CloudWatch Agent).

**CloudWatch Agent (install on EC2):**
```bash
# Collects: memory, disk, custom app metrics, log files
sudo yum install amazon-cloudwatch-agent
# Configure: /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

**Alarms:**
```
Metric: ALB TargetResponseTime
Condition: Average > 2 seconds for 3 consecutive periods (5 min each)
Action: SNS topic -> PagerDuty / Slack / email
States: OK -> ALARM -> INSUFFICIENT_DATA
```

**Alarm actions:**
- Send notification (SNS)
- Auto Scaling action (scale out/in)
- EC2 action (stop, terminate, reboot)
- Systems Manager action (run automation)

**Rule of thumb:** CloudWatch for AWS-native monitoring -- the free tier covers basics. Add CloudWatch Agent for memory and disk metrics on EC2. Alarm on user-facing symptoms (5XX rate, latency) not just resource metrics (CPU). Use high-resolution metrics only for latency-sensitive workloads where the extra cost is justified.
