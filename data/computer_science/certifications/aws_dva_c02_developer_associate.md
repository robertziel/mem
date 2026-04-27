### AWS Certified Developer - Associate (DVA-C02)

**The dev-focused AWS cert.** Building and deploying on AWS, CI/CD, Lambda, DynamoDB depth. Good pairing with SAA.

**Exam logistics:**
- Code: DVA-C02
- Duration: 130 min, 65 questions
- Passing: 720/1000
- Cost: $150 USD
- Validity: 3 years

**Domain weights (DVA-C02):**

| Domain | Weight | Focus |
|---|---|---|
| 1. Development with AWS Services | 32% | Lambda, DynamoDB, API Gateway, SDK usage |
| 2. Security | 26% | IAM, KMS, Secrets Manager, Cognito, encryption in transit/rest |
| 3. Deployment | 24% | CodePipeline/Build/Deploy, CloudFormation, SAM, CDK, Elastic Beanstalk |
| 4. Troubleshooting and Optimization | 18% | CloudWatch, X-Ray, logging, tracing, performance tuning |

**What DVA tests that SAA doesn't:**
- **Lambda internals** — cold starts, concurrency (reserved/provisioned), layers, environment variables, VPC integration cost
- **DynamoDB depth** — partition keys, GSIs vs LSIs, transactions, streams, DAX, on-demand vs provisioned, condition expressions
- **API Gateway** — REST vs HTTP vs WebSocket API, integration types (Lambda proxy, HTTP, AWS service), usage plans, API keys, caching
- **CloudFormation** — intrinsic functions (!Ref, !GetAtt, !Sub), change sets, stack sets, nested stacks, drift detection
- **SAM** — template transforms, local testing (sam local), deployment modes
- **CDK basics** — L1/L2/L3 constructs, synth, deploy
- **CodeDeploy** — all-at-once vs canary vs linear deployment types for Lambda/ECS/EC2
- **X-Ray** — trace headers, sampling, service map, subsegments
- **SQS coding patterns** — long polling, visibility timeout, DLQ, message attributes

**Killer coding patterns to know:**
- Lambda error handling and retries (sync/async/stream triggers differ)
- DynamoDB conditional writes (`ConditionExpression: attribute_not_exists`)
- Pre-signed S3 URLs (generating, expiry, permissions required)
- Cognito user pool vs identity pool (authentication vs AWS credential vending)
- API Gateway + Lambda authorizers (token-based vs request-based)
- Step Functions states (Task, Choice, Parallel, Map, Wait)
- S3 event → Lambda vs S3 → EventBridge → Lambda (timing, delivery)

**Study path:**
- Stephane Maarek DVA course (most popular)
- Adrian Cantrill dev-focused sections
- Tutorials Dojo practice exams (standard recommendation)
- AWS SDK for your language — know `boto3` / `aws-sdk-js` / `aws-sdk-go` basic patterns

**Existing memos:**
- `devops/cloud_aws/` — Lambda, DynamoDB, API Gateway, CloudWatch, X-Ray files
- `design_patterns/payment_network/` — idempotency (relevant to Lambda retries)

**Who it's for:** Backend developers, serverless engineers. Prep time: 60-100 hours if you have SAA; 100-150 hours without.

**Rule of thumb:** DVA is more code-oriented than SAA — expect CLI commands, SDK snippets, CloudFormation YAML, and IAM policy JSON in questions. Know Lambda intimately (limits, invocation models, concurrency) and DynamoDB data modeling (GSI design, access patterns). SAA + DVA combined covers 80% of backend AWS roles.
