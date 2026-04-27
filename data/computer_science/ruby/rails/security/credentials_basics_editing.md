### Rails Credentials Basics & Editing

**What are Rails credentials?**
Rails credentials store sensitive configuration (API keys, passwords) in an encrypted file. Only the master key can decrypt them. The encrypted file is safe to commit to version control.

**Files involved:**
```
config/credentials.yml.enc   # encrypted credentials (committed to git)
config/master.key             # decryption key (NEVER commit, in .gitignore)
```

**Editing credentials:**
```ruby
# Opens decrypted credentials in your editor
$ EDITOR=vim bin/rails credentials:edit

# Decrypted contents look like:
# aws:
#   access_key_id: AKIA...
#   secret_access_key: wJalr...
# stripe:
#   secret_key: sk_live_...
# secret_key_base: abc123...
```

**Accessing credentials in code:**
```ruby
# Access nested values
Rails.application.credentials.aws[:access_key_id]
Rails.application.credentials.dig(:aws, :access_key_id)

# Top-level values
Rails.application.credentials.secret_key_base

# With a fallback
Rails.application.credentials.dig(:stripe, :secret_key) || ENV["STRIPE_SECRET_KEY"]
```

**Multi-environment credentials (Rails 6.1+):**
```ruby
# Create per-environment files
$ EDITOR=vim bin/rails credentials:edit --environment production
$ EDITOR=vim bin/rails credentials:edit --environment staging

# Creates:
# config/credentials/production.yml.enc
# config/credentials/production.key
# config/credentials/staging.yml.enc
# config/credentials/staging.key

# Rails auto-loads the right file based on RAILS_ENV
# Production credentials override the base credentials.yml.enc

# Access is identical
Rails.application.credentials.dig(:aws, :access_key_id)
```

**How Rails finds the master key:**
```ruby
# Priority order:
# 1. ENV["RAILS_MASTER_KEY"] (highest priority, used in production deploys)
# 2. config/credentials/production.key (per-environment key)
# 3. config/master.key (fallback)

# On Heroku / cloud platforms:
$ heroku config:set RAILS_MASTER_KEY=$(cat config/master.key)

# Docker / Kubernetes:
# Pass as an environment variable or mounted secret
```

**credentials.yml.enc vs secrets.yml (legacy):**
| Feature | credentials.yml.enc | secrets.yml (legacy) |
|---------|---------------------|----------------------|
| Encrypted | Yes (AES-128-GCM) | No (plain text) |
| Safe to commit | Yes | No |
| Per-environment | Yes (Rails 6.1+) | Yes (YAML sections) |
| Editing | `rails credentials:edit` | Direct file edit |
| Status | Current standard | Deprecated since Rails 5.2 |

**Rule of thumb:** Use `rails credentials:edit` for all secrets -- never store plaintext secrets in config files or code. Use per-environment credentials for different keys across staging/production. Pass `RAILS_MASTER_KEY` as an environment variable in production deployments.
