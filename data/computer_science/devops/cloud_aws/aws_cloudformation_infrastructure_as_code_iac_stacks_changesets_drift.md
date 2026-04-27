### AWS CloudFormation (Infrastructure as Code)

**What CloudFormation does:**
- AWS-native IaC: define infrastructure in YAML/JSON templates
- Creates, updates, and deletes AWS resources as a unit (stack)
- Dependency resolution: creates resources in correct order

**Template structure:**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Web application stack

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
  InstanceType:
    Type: String
    Default: t3.micro

Resources:
  WebServer:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
      ImageId: ami-0123456789abcdef0
      Tags:
        - Key: Environment
          Value: !Ref Environment

  WebBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "${Environment}-web-assets"

Outputs:
  InstanceId:
    Value: !Ref WebServer
  BucketArn:
    Value: !GetAtt WebBucket.Arn
```

**Key sections:**
| Section | Purpose |
|---------|---------|
| Parameters | Input values (env, instance type, etc.) |
| Resources | AWS resources to create (required) |
| Outputs | Values to export (IDs, ARNs, URLs) |
| Mappings | Static key-value lookup tables |
| Conditions | Conditional resource creation |

**Intrinsic functions:**
```yaml
!Ref ParameterOrResource         # reference parameter value or resource ID
!GetAtt Resource.Attribute       # get attribute (ARN, DNS name, etc.)
!Sub "arn:aws:s3:::${BucketName}" # string substitution
!Join ["-", [prod, web, bucket]]  # join strings
!Select [0, !GetAZs ""]          # pick from list
!If [IsProd, t3.large, t3.micro] # conditional value
```

**Change sets (safe updates):**
```bash
# Preview changes before applying
aws cloudformation create-change-set \
  --stack-name my-stack \
  --template-body file://template.yaml \
  --change-set-name update-v2

# Review what will change (add, modify, replace, delete)
aws cloudformation describe-change-set --change-set-name update-v2 --stack-name my-stack

# Apply
aws cloudformation execute-change-set --change-set-name update-v2 --stack-name my-stack
```

**Drift detection:**
```bash
aws cloudformation detect-stack-drift --stack-name my-stack
# Checks if actual resources match template (manual changes detected)
```

**Stack operations:**
```bash
aws cloudformation create-stack --stack-name my-stack --template-body file://template.yaml
aws cloudformation update-stack --stack-name my-stack --template-body file://template.yaml
aws cloudformation delete-stack --stack-name my-stack
aws cloudformation describe-stacks --stack-name my-stack
aws cloudformation describe-stack-events --stack-name my-stack  # debug failures
```

**Nested stacks:**
```yaml
Resources:
  VPCStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/templates/vpc.yaml
      Parameters:
        CidrBlock: 10.0.0.0/16
```

**CloudFormation vs Terraform:**
| Feature | CloudFormation | Terraform |
|---------|---------------|-----------|
| Provider | AWS only | Multi-cloud |
| Language | YAML/JSON | HCL |
| State | Managed by AWS (free) | Self-managed (S3 + DynamoDB) |
| Drift detection | Built-in | `terraform plan` |
| Rollback | Automatic on failure | Manual |
| Community modules | Limited | Extensive registry |
| Best for | AWS-only, simple stacks | Multi-cloud, complex infra |

**Rule of thumb:** Use Terraform for multi-cloud or complex infrastructure. CloudFormation if you're AWS-only and want zero state management. Always use change sets before updating production stacks. Use nested stacks to keep templates manageable.
