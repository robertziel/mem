### Rails Custom Credentials & Troubleshooting

**Migrating from secrets.yml:**
```ruby
# Old way (config/secrets.yml) -- deprecated
production:
  secret_key_base: <%= ENV["SECRET_KEY_BASE"] %>
  stripe_key: <%= ENV["STRIPE_KEY"] %>

# New way: move all secrets into credentials
$ EDITOR=vim bin/rails credentials:edit
# Paste your secrets in YAML format
```

**Custom credentials for different uses:**
```ruby
# You can also use Rails.application.credentials with ActiveSupport::EncryptedConfiguration
# For additional encrypted config files:
custom_config = ActiveSupport::EncryptedConfiguration.new(
  config_path: Rails.root.join("config/payment.yml.enc"),
  key_path: Rails.root.join("config/payment.key"),
  env_key: "RAILS_PAYMENT_KEY",
  raise_if_missing_key: true
)
custom_config.api_key
```

**Configuration pattern with credentials:**
```ruby
# config/initializers/stripe.rb
Stripe.api_key = Rails.application.credentials.dig(:stripe, :secret_key)

# config/initializers/aws.rb
Aws.config.update(
  region: "us-east-1",
  credentials: Aws::Credentials.new(
    Rails.application.credentials.dig(:aws, :access_key_id),
    Rails.application.credentials.dig(:aws, :secret_access_key)
  )
)
```

**Troubleshooting:**
```ruby
# Check if credentials can be decrypted
$ bin/rails credentials:show

# "Missing encryption key" error:
# - master.key is missing AND RAILS_MASTER_KEY is not set
# - Fix: get master.key from a teammate or set the env var

# "ActiveSupport::MessageEncryptor::InvalidMessage" error:
# - Wrong key for the encrypted file (key was regenerated)
# - Fix: ensure master.key matches the one used to encrypt

# Regenerate credentials (destructive -- loses existing secrets):
$ rm config/credentials.yml.enc
$ EDITOR=vim bin/rails credentials:edit  # creates new file + key
```

**Security best practices:**
```ruby
# .gitignore (Rails generates this by default)
config/master.key
config/credentials/*.key

# Never log credentials
Rails.logger.info(credentials.secret_key)  # NEVER do this

# Use dig with fallback for safety
api_key = Rails.application.credentials.dig(:service, :api_key) ||
          raise("Missing service API key in credentials")
```

**Rule of thumb:** Share master.key securely with teammates (never via git or chat). Use `ActiveSupport::EncryptedConfiguration` for additional encrypted config files beyond the default credentials. If migrating from secrets.yml, move everything into encrypted credentials. Always check `bin/rails credentials:show` when debugging decryption issues.
