### AWS CodePipeline, CodeBuild & CodeDeploy (CI/CD)

**AWS CI/CD suite:**
```
CodeCommit (Git repo) → CodeBuild (build + test) → CodeDeploy (deploy)
                          ↑                           ↑
                    CodePipeline (orchestrates the entire flow)
```

**CodePipeline (orchestration):**
- Visual pipeline: Source → Build → Test → Deploy
- Sources: CodeCommit, GitHub, S3, ECR
- Integrates with: CodeBuild, CodeDeploy, ECS, Lambda, CloudFormation

```yaml
# Pipeline stages
Source:  GitHub repo (trigger on push to main)
  → Build: CodeBuild (docker build, run tests)
    → Deploy-Staging: ECS (deploy to staging)
      → Approval: Manual approval gate
        → Deploy-Prod: ECS (deploy to production)
```

**CodeBuild (build + test):**
```yaml
# buildspec.yml (in repo root)
version: 0.2
phases:
  install:
    runtime-versions:
      ruby: 3.2
    commands:
      - bundle install
  pre_build:
    commands:
      - bundle exec rubocop
      - bundle exec rspec
  build:
    commands:
      - docker build -t myapp:$CODEBUILD_RESOLVED_SOURCE_VERSION .
      - docker push $ECR_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION
  post_build:
    commands:
      - echo "Build complete"
artifacts:
  files:
    - imagedefinitions.json
cache:
  paths:
    - vendor/bundle/**/*
```

- Managed build environments (Ubuntu, Amazon Linux, custom Docker)
- Scales automatically (concurrent builds)
- Pay per build minute
- Caching: S3-backed cache for dependencies

**CodeDeploy (deployment):**
| Target | Deployment type | How |
|--------|----------------|-----|
| EC2/On-prem | In-place or Blue/Green | Install agent, deploy via appspec.yml |
| ECS | Blue/Green | Traffic shift (all-at-once, linear, canary) |
| Lambda | Blue/Green | Traffic shift between function versions |

**ECS Blue/Green deployment:**
```
1. Deploy new task set (green) alongside current (blue)
2. Shift traffic: canary 10% → wait 5 min → 100%
3. If CloudWatch alarm fires → automatic rollback
4. Old task set terminated after success
```

**CodeDeploy traffic shifting:**
| Strategy | How |
|----------|-----|
| AllAtOnce | 100% immediately |
| Linear10PercentEvery1Minute | 10% every minute |
| Canary10Percent5Minutes | 10% → wait 5 min → 90% |

**AWS CI/CD vs GitHub Actions:**
| Feature | AWS CodePipeline | GitHub Actions |
|---------|-----------------|---------------|
| Source | CodeCommit, GitHub, S3 | GitHub (native) |
| Build | CodeBuild | Runners (hosted/self) |
| Deploy | CodeDeploy (ECS, EC2, Lambda) | Any (via actions) |
| Integration | Deep AWS (IAM, VPC, ECS) | Broad ecosystem |
| Pricing | Pay per pipeline + build min | Free tier + per min |
| Best for | AWS-centric, ECS Blue/Green | Most teams, multi-cloud |

**Rule of thumb:** Use GitHub Actions for most teams (simpler, broader ecosystem). Use CodePipeline + CodeDeploy when you need ECS Blue/Green with automatic rollback on CloudWatch alarms. CodeBuild is a solid managed build service if you want to stay AWS-native.
