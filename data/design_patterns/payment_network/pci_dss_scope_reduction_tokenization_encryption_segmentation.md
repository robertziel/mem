### PCI DSS Scope Reduction — Tokenization, Encryption, and Segmentation

**Problem:** PCI DSS (Payment Card Industry Data Security Standard) applies to every system that stores, processes, or transmits cardholder data. Compliance is expensive (audits, penetration tests, documentation). The best strategy is to minimize the number of systems in scope by keeping card data out of your environment entirely.

**Scope reduction strategies (most to least effective):**
```
1. Never touch card data (best)
   → Use hosted payment page (Stripe Elements, Adyen Drop-in)
   → Card number goes directly from browser to PSP
   → Your server never sees the PAN
   → PCI scope: SAQ A (simplest, ~20 questions)

2. Tokenize immediately
   → Card enters your system briefly
   → Immediately tokenized, PAN discarded
   → Only token vault is in PCI scope
   → PCI scope: SAQ A-EP or SAQ D (depends on implementation)

3. Encrypt in transit and at rest
   → PAN encrypted with AES-256 at point of entry
   → Keys in HSM (Hardware Security Module)
   → Encrypted PAN in database
   → PCI scope: full SAQ D (most complex)
```

**Architecture — hosted payment page (minimum scope):**
```
┌────────────┐    card data    ┌───────────────┐
│  Browser   │────────────────>│ Stripe/Adyen  │
│ (customer) │    (direct,     │ (PCI Level 1) │
└────────────┘    your server  └───────┬───────┘
      │           never sees it)       │
      │ order_id                       │ token
      ▼                                ▼
┌────────────┐                 ┌───────────────┐
│ Your Server│◄────────────────│  Webhook /    │
│ (NOT in    │    token only   │  API callback │
│ PCI scope) │                 └───────────────┘
└────────────┘

Your server receives: tok_xxxx (not the PAN)
Your server stores: tok_xxxx (safe, not cardholder data)
Your server charges: API call with tok_xxxx → Stripe handles the rest
```

**Architecture — token vault (medium scope):**
```
┌────────────┐    PAN     ┌──────────────┐    token    ┌────────────┐
│  POS/App   │───────────>│ Token Vault  │────────────>│ Your App   │
│            │            │ (PCI scope)  │             │ (no PCI)   │
└────────────┘            └──────┬───────┘             └────────────┘
                                 │
                          ┌──────▼───────┐
                          │   HSM        │
                          │ (key storage)│
                          └──────────────┘

Only the token vault + HSM are in PCI scope.
Your application servers, databases, etc. are OUT of scope.
```

**Encryption requirements (PCI DSS v4.0, effective 2025):**
```
At rest:
  - AES-256 or equivalent for stored cardholder data
  - Key stored separately from data (ideally in HSM)
  - Key rotation: at least annually, or on suspected compromise
  - Split knowledge: no single person has the full key

In transit:
  - TLS 1.2+ for all cardholder data transmission
  - No SSL, TLS 1.0, or TLS 1.1 (deprecated)
  - Strong cipher suites only

Key management:
  - HSM (Hardware Security Module) for key storage — keys never leave HSM
  - Key rotation without downtime (encrypt new data with new key, 
    re-encrypt old data in background)
  - Key custodians: minimum 2 people required to reconstruct key
  - Key destruction: cryptographic erasure (delete key = data unreadable)
```

**Key rotation implementation:**
```ruby
class EncryptionService
  # Encrypt with current active key
  def encrypt(plaintext)
    key = KeyStore.active_key
    cipher = OpenSSL::Cipher::AES256.new(:GCM)
    cipher.encrypt
    cipher.key = key.material
    iv = cipher.random_iv
    ciphertext = cipher.update(plaintext) + cipher.final
    tag = cipher.auth_tag

    # Store: key_version + iv + tag + ciphertext
    { key_version: key.version, iv: iv, tag: tag, data: ciphertext }
  end

  # Decrypt with the key version that encrypted it
  def decrypt(encrypted)
    key = KeyStore.key_for_version(encrypted[:key_version])
    cipher = OpenSSL::Cipher::AES256.new(:GCM)
    cipher.decrypt
    cipher.key = key.material
    cipher.iv = encrypted[:iv]
    cipher.auth_tag = encrypted[:tag]
    cipher.update(encrypted[:data]) + cipher.final
  end
end

# Background job: re-encrypt old data with new key
class KeyRotationJob < ApplicationJob
  def perform
    new_key = KeyStore.rotate!  # generates new key, marks old as "decrypt only"

    EncryptedRecord.where.not(key_version: new_key.version).find_each do |record|
      plaintext = EncryptionService.decrypt(record.encrypted_data)
      record.update!(encrypted_data: EncryptionService.encrypt(plaintext))
    end

    KeyStore.retire_old_keys!  # delete keys no longer referenced
  end
end
```

**Network segmentation (reduces scope boundary):**
```
┌─────────────────────────────────────────────┐
│           Cardholder Data Environment (CDE)  │ ← PCI scope
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │Token Vault│  │ HSM/KMS  │  │ PCI DB    │ │
│  └──────────┘  └──────────┘  └───────────┘ │
│                                              │
│  Firewall rules: only CDE → payment APIs     │
│  No CDE → internet (except payment gateway)  │
│  No app servers → CDE (only via API)         │
└─────────────────────┬───────────────────────┘
                      │ API only (tokens)
┌─────────────────────▼───────────────────────┐
│           Application Environment            │ ← NOT in PCI scope
│  ┌───────────┐  ┌──────────┐  ┌──────────┐ │
│  │ App Server │  │ App DB   │  │ Workers  │ │
│  └───────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────┘

Key: app servers NEVER see raw PAN — only tokens.
     Only CDE systems are in PCI audit scope.
```

**PCI DSS compliance levels:**
```
Level 1: > 6M transactions/year → annual on-site audit (QSA)
Level 2: 1-6M transactions/year → annual SAQ
Level 3: 20K-1M e-commerce transactions/year → annual SAQ
Level 4: < 20K e-commerce or < 1M total → annual SAQ

SAQ types (Self-Assessment Questionnaire):
  SAQ A:    hosted payment page, card data never touches your server (~20 questions)
  SAQ A-EP: e-commerce with JavaScript control (Stripe.js) (~140 questions)
  SAQ D:    full scope, you handle card data directly (~400 questions)

Cost difference:
  SAQ A compliance: ~$5K-$20K/year
  SAQ D compliance: ~$50K-$500K/year
  The architecture choice saves 10-50× in compliance cost
```

**Rule of thumb:** The best PCI strategy is to never touch card data — use hosted payment pages (Stripe Elements, Adyen Drop-in) and achieve SAQ A. If you must handle cards, tokenize immediately and isolate the token vault in a segmented CDE. Encrypt with AES-256, store keys in HSM, rotate annually. Network segmentation between CDE and application environment keeps most of your infrastructure out of scope. The architecture decision at day one determines whether PCI compliance costs $5K or $500K annually.
