### AWS KMS (Key Management Service)

**What KMS does:**
- Create and manage encryption keys
- Encrypt/decrypt data across AWS services
- Central key management with audit trail (CloudTrail)
- FIPS 140-2 validated hardware security modules (HSMs)

**How KMS encryption works (envelope encryption):**
```
1. You request a data key from KMS
2. KMS returns: plaintext data key + encrypted data key (encrypted by CMK)
3. Your app encrypts data with plaintext data key
4. Store: encrypted data + encrypted data key together
5. Discard plaintext data key from memory

Decryption:
1. Send encrypted data key to KMS
2. KMS decrypts it using CMK → returns plaintext data key
3. Your app decrypts data with plaintext data key
```

Why envelope encryption: you don't send your actual data to KMS (just the small key).

**Key types:**
| Type | Managed by | Rotation | Cost | Use when |
|------|-----------|----------|------|----------|
| AWS owned | AWS | Automatic | Free | S3 default (SSE-S3) |
| AWS managed | AWS | Annual (automatic) | Free (per-service) | Default KMS for RDS, EBS, etc. |
| Customer managed (CMK) | You | Optional (annual) | $1/month + API calls | Custom policies, cross-account, audit |
| External key | You (imported) | Manual | $1/month + API calls | Regulatory, bring your own key |

**CLI operations:**
```bash
# Create a key
aws kms create-key --description "Production data encryption"

# Create an alias (friendly name)
aws kms create-alias --alias-name alias/prod-data --target-key-id <key-id>

# Encrypt (small data directly)
aws kms encrypt --key-id alias/prod-data --plaintext "secret" --output text --query CiphertextBlob

# Decrypt
aws kms decrypt --ciphertext-blob fileb://encrypted.bin --output text --query Plaintext

# Generate data key (for envelope encryption)
aws kms generate-data-key --key-id alias/prod-data --key-spec AES_256
```

**Which AWS services use KMS:**
| Service | What's encrypted | Key type |
|---------|-----------------|----------|
| S3 | Objects (SSE-KMS) | AWS managed or CMK |
| EBS | Volume data | AWS managed or CMK |
| RDS | Database storage | AWS managed or CMK |
| Secrets Manager | Secret values | AWS managed or CMK |
| SSM Parameter Store | SecureString params | AWS managed or CMK |
| SQS | Message bodies | AWS managed or CMK |
| Lambda | Environment variables | AWS managed |
| CloudTrail | Log files | CMK |

**Key policies (who can use the key):**
```json
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::123:role/app-role" },
    "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
    "Resource": "*"
  }]
}
```

**Cross-account key sharing:**
```
Account A owns the CMK → key policy grants Account B decrypt permission
Account B's role assumes permission → can decrypt data encrypted by Account A's key
```

**Automatic key rotation:**
```bash
aws kms enable-key-rotation --key-id <key-id>
# Rotates annually. Old key versions kept for decryption.
# New data encrypted with new key version automatically.
```

**Rule of thumb:** Use AWS-managed keys for most services (free, simple). Customer-managed CMKs when you need: cross-account access, custom key policies, audit requirements, or regulatory compliance. Enable key rotation. KMS is the backbone of AWS encryption — every encrypted service uses it behind the scenes.
