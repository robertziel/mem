### AWS Cost Optimization

**Top cost drivers and how to reduce them:**

**Compute:**
- Right-size instances (use AWS Compute Optimizer recommendations)
- Use Spot instances for fault-tolerant workloads (batch, CI runners)
- Reserved Instances or Savings Plans for steady-state (1yr = ~40%, 3yr = ~60% savings)
- Stop/terminate unused instances
- Use Fargate Spot for non-critical ECS tasks

**Storage:**
- S3 lifecycle policies: transition to IA/Glacier, expire old objects
- S3 Intelligent-Tiering for unknown access patterns
- Delete unattached EBS volumes and old snapshots
- Use gp3 over gp2 (cheaper, better baseline IOPS)

**Data transfer:**
- VPC endpoints for S3/DynamoDB (avoid NAT Gateway data charges)
- NAT Gateway is expensive: ~$0.045/GB + hourly. Consider NAT instances for low traffic
- CloudFront reduces origin data transfer costs
- Keep traffic within the same AZ when possible

**Database:**
- Reserved instances for RDS
- Aurora Serverless v2 for variable workloads
- DynamoDB On-Demand for unpredictable traffic (vs over-provisioned capacity)
- ElastiCache reserved nodes

**Monitoring costs:**
- AWS Cost Explorer: visualize spend by service, tag, account
- AWS Budgets: alerts when spend exceeds threshold
- Cost Allocation Tags: tag resources by team/project/environment
- AWS Trusted Advisor: recommendations for cost, security, performance

**Quick wins checklist:**
- [ ] Delete unused EBS volumes, Elastic IPs, old snapshots
- [ ] Stop non-production instances nights/weekends (Lambda scheduler)
- [ ] Enable S3 lifecycle policies on log buckets
- [ ] Use VPC endpoints for S3 traffic
- [ ] Review NAT Gateway data processing charges
- [ ] Right-size over-provisioned RDS instances
- [ ] Use Spot for CI/CD runners and batch jobs
- [ ] Tag everything for cost allocation

**Rule of thumb:** Tag everything from day one. Review Cost Explorer weekly. Savings Plans for baseline, Spot for flexible, On-Demand for the rest. Data transfer and NAT Gateway are the sneaky cost killers.
