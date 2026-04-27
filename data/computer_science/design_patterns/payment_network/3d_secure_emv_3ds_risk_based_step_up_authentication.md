### 3D Secure (EMV 3DS) — Risk-Based Step-Up Authentication

**Visa context:** EMV 3D Secure (branded as "Visa Secure") adds an authentication layer between merchant and issuer. The issuer evaluates each transaction using hundreds of data points and decides: frictionless (approve silently) or challenge (ask cardholder to verify). Visa reports 9% higher approval rates with 3DS compared to without.

**Two flows:**
```
Frictionless flow (low risk — ~90% of transactions):
  1. Merchant collects payment details
  2. Merchant → 3DS Server → Directory Server → Issuer (ACS)
  3. Issuer evaluates risk using 150+ data elements
  4. Risk is LOW → issuer authenticates silently (no cardholder interaction)
  5. Authentication result → merchant → proceed to authorization
  Cardholder experience: sees nothing extra, just "payment complete"

Challenge flow (elevated risk — ~10% of transactions):
  1. Merchant → 3DS Server → Directory Server → Issuer (ACS)
  2. Issuer evaluates risk
  3. Risk is ELEVATED → issuer sends challenge
  4. Cardholder verifies via:
     - One-time SMS/email code
     - Banking app push notification
     - Biometric (fingerprint, face)
     - Knowledge question
  5. Cardholder passes challenge → authenticated
  6. Authentication result → merchant → proceed to authorization
  Cardholder experience: sees OTP/biometric prompt, then "payment complete"
```

**Data elements sent to issuer for risk evaluation (150+):**
```
Transaction:     amount, currency, merchant name, MCC, recurring flag
Cardholder:      name, email, phone, billing address, shipping address
Device:          browser user-agent, screen resolution, timezone, IP address
                 JavaScript enabled, Java enabled, language, color depth
Account:         account age, account change date, password change date
                 number of transactions in 24h, 6 months, year
History:         previous 3DS authentications, challenge history
                 suspicious activity flag, shipping name matches card name
Merchant:        merchant risk assessment, acquirer risk assessment
```

**Liability shift — the business incentive:**
```
Without 3DS:
  Fraud occurs → merchant is liable (chargeback hits merchant)

With 3DS (authentication successful):
  Fraud occurs → issuer is liable (chargeback hits issuer)
  The merchant is protected because issuer authenticated the cardholder

This is why merchants implement 3DS:
  - Reduces chargebacks (liability shifts to issuer)
  - Higher approval rates (issuers trust authenticated transactions more)
  - Required by regulation in EU (PSD2 SCA mandate)
```

**General software pattern: Risk-Based Step-Up Authentication**

```ruby
# Same pattern: adaptive authentication in your app
class AuthenticationService
  def authenticate(user, context)
    risk = RiskEngine.evaluate(
      user: user,
      ip: context[:ip],
      device: context[:device_fingerprint],
      location: context[:geo],
      action: context[:action]  # "login", "transfer_money", "change_password"
    )

    case risk.level
    when :low
      # Frictionless — proceed without extra verification
      authenticate_silently(user)
    when :medium
      # Step-up — require additional verification
      send_otp(user)
      { status: :challenge, method: :otp }
    when :high
      # Block or require strongest verification
      require_biometric(user)
      { status: :challenge, method: :biometric }
    end
  end
end

class RiskEngine
  def self.evaluate(user:, ip:, device:, location:, action:)
    score = 0

    # New device?
    score += 30 unless user.known_devices.include?(device)

    # Unusual location?
    score += 20 unless user.usual_locations.include?(location[:country])

    # Unusual time?
    score += 10 unless user.usual_hours.include?(Time.current.hour)

    # High-value action?
    score += 20 if action.in?(["transfer_money", "change_password"])

    # Recent failed attempts?
    score += 25 if user.failed_login_attempts_1h > 3

    RiskResult.new(score: score, level: score_to_level(score))
  end

  def self.score_to_level(score)
    case score
    when 0..30   then :low         # frictionless
    when 31..60  then :medium      # step-up (OTP)
    when 61..100 then :high        # block or biometric
    end
  end
end
```

**Where you see this pattern:**
- Banking apps: low-risk login = fingerprint, high-risk transfer = OTP + PIN
- Google: new device login = email verification, known device = frictionless
- AWS: IAM console login = MFA, API call from known IP = frictionless
- E-commerce: small order = no extra auth, large order = verify address/OTP

**Rule of thumb:** Don't apply the same authentication friction to every transaction. Score risk based on device, location, amount, and behavior — then challenge only when the risk warrants it. Frictionless should be the default (90%+ of transactions). The goal is to maximize approval rates while minimizing fraud — not to block everything suspicious. Liability shift is the business incentive that aligns merchant and issuer interests.
