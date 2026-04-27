### AWS SES (Simple Email Service)

**What SES does:**
- Send and receive emails at scale
- Transactional emails (order confirmation, password reset)
- Marketing emails (newsletters, campaigns)
- SMTP or API interface

**Sending methods:**
```ruby
# AWS SDK (Ruby)
ses = Aws::SESV2::Client.new(region: 'us-east-1')
ses.send_email(
  from_email_address: 'noreply@example.com',
  destination: { to_addresses: ['user@example.com'] },
  content: {
    simple: {
      subject: { data: 'Order Confirmation' },
      body: { html: { data: '<h1>Your order is confirmed</h1>' } }
    }
  }
)

# Or use SMTP (works with any email library: ActionMailer, Nodemailer)
# SMTP endpoint: email-smtp.us-east-1.amazonaws.com:587
```

**Rails ActionMailer + SES:**
```ruby
# config/environments/production.rb
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: 'email-smtp.us-east-1.amazonaws.com',
  port: 587,
  user_name: ENV['SES_SMTP_USERNAME'],
  password: ENV['SES_SMTP_PASSWORD'],
  authentication: :login,
  enable_starttls_auto: true
}
```

**Sandbox mode (new accounts):**
- Can only send TO verified email addresses
- Max 200 emails/24h, 1 email/sec
- Request production access via AWS Support (takes 24-48h)

**Domain verification:**
```
1. Add TXT record for domain verification
2. Set up DKIM (3 CNAME records) — authenticates emails, improves deliverability
3. Set up SPF (optional, SES handles via Return-Path)
4. Set up DMARC (TXT record: _dmarc.example.com)
```

**Bounce and complaint handling:**
```
SES → SNS Topic → Lambda / SQS → Process bounces/complaints

Types:
  Hard bounce: invalid email (remove from list immediately)
  Soft bounce: mailbox full, try later
  Complaint: recipient marked as spam (remove immediately)
```

**Reputation dashboard:**
- Bounce rate: keep under 5% (SES suspends at 10%)
- Complaint rate: keep under 0.1% (SES suspends at 0.5%)
- Monitor in SES console or CloudWatch metrics

**SES vs SendGrid vs Mailgun:**
| Feature | SES | SendGrid | Mailgun |
|---------|-----|----------|---------|
| Cost | $0.10/1000 emails | Free up to 100/day | Free up to 5000/month |
| AWS integration | Native | SDK | SDK |
| Template management | Basic | Rich editor | Rich editor |
| Analytics | Basic (CloudWatch) | Detailed (opens, clicks) | Detailed |
| Deliverability tools | Basic | Advanced | Advanced |
| Best for | AWS apps, high volume | Marketing + transactional | Developer-focused |

**Rule of thumb:** SES for transactional emails in AWS (cheapest at scale). Verify domain with DKIM/DMARC for deliverability. Monitor bounce/complaint rates (SES will suspend you). Use SNS for bounce handling. For marketing emails with rich analytics, consider SendGrid alongside SES.
