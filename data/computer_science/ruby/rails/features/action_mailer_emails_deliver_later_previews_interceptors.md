### Action Mailer: Emails in Rails

**Basic mailer setup:**
```ruby
# app/mailers/application_mailer.rb
class ApplicationMailer < ActionMailer::Base
  default from: "noreply@example.com"
  layout "mailer"
end

# app/mailers/user_mailer.rb
class UserMailer < ApplicationMailer
  def welcome(user)
    @user = user
    @login_url = login_url
    mail(to: @user.email, subject: "Welcome to Our App")
  end

  def password_reset(user, token)
    @user = user
    @reset_url = edit_password_url(token: token)
    mail(to: @user.email, subject: "Reset your password")
  end
end
```

**Mailer views (like controller views):**
```erb
<%# app/views/user_mailer/welcome.html.erb %>
<h1>Welcome, <%= @user.name %>!</h1>
<p>Get started by <a href="<%= @login_url %>">logging in</a>.</p>

<%# app/views/user_mailer/welcome.text.erb (plain text fallback) %>
Welcome, <%= @user.name %>!
Get started by visiting: <%= @login_url %>
```

**deliver_now vs deliver_later:**
```ruby
# Synchronous: blocks until email is sent (avoid in web requests)
UserMailer.welcome(user).deliver_now

# Asynchronous: enqueues via ActiveJob (preferred)
UserMailer.welcome(user).deliver_later

# With options
UserMailer.welcome(user).deliver_later(wait: 5.minutes)
UserMailer.welcome(user).deliver_later(wait_until: 1.hour.from_now)
UserMailer.welcome(user).deliver_later(queue: :mailers)
```

| Method | Execution | Use when |
|--------|-----------|----------|
| `deliver_now` | Synchronous, blocks | Tests, console, critical inline sends |
| `deliver_later` | Async via ActiveJob/Sidekiq | Web requests (always prefer this) |

**Delivery methods (SMTP, SendGrid, etc.):**
```ruby
# config/environments/production.rb
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address:         "smtp.sendgrid.net",
  port:            587,
  user_name:       "apikey",
  password:        Rails.application.credentials.dig(:sendgrid, :api_key),
  authentication:  :plain,
  enable_starttls: true,
  domain:          "example.com"
}

# Development: use letter_opener to preview in browser
# Gemfile: gem "letter_opener", group: :development
config.action_mailer.delivery_method = :letter_opener

# Test: collect sent emails in ActionMailer::Base.deliveries
config.action_mailer.delivery_method = :test
```

**Mailer previews (view emails in browser):**
```ruby
# test/mailers/previews/user_mailer_preview.rb (or spec/mailers/previews/)
class UserMailerPreview < ActionMailer::Preview
  def welcome
    user = User.first || User.new(name: "Test User", email: "test@example.com")
    UserMailer.welcome(user)
  end

  def password_reset
    user = User.first
    UserMailer.password_reset(user, "abc123token")
  end
end

# Visit: http://localhost:3000/rails/mailers/user_mailer/welcome
```

**Interceptors (modify or block emails):**
```ruby
# Redirect all emails in staging to a safe address
class StagingEmailInterceptor
  def self.delivering_email(message)
    message.to = ["staging-inbox@example.com"]
    message.subject = "[STAGING] #{message.subject}"
  end
end

# Register in an initializer
# config/initializers/mail_interceptors.rb
if Rails.env.staging?
  ActionMailer::Base.register_interceptor(StagingEmailInterceptor)
end

# Observer (for logging/tracking, does NOT modify the email)
class EmailObserver
  def self.delivered_email(message)
    Rails.logger.info "Email sent to #{message.to.join(', ')}: #{message.subject}"
  end
end

ActionMailer::Base.register_observer(EmailObserver)
```

**Attachments:**
```ruby
class InvoiceMailer < ApplicationMailer
  def send_invoice(user, invoice)
    @user = user
    @invoice = invoice

    # File attachment
    attachments["invoice_#{invoice.id}.pdf"] = invoice.generate_pdf

    # Inline attachment (for embedded images)
    attachments.inline["logo.png"] = File.read(Rails.root.join("app/assets/images/logo.png"))

    mail(to: @user.email, subject: "Your Invoice ##{invoice.id}")
  end
end
```

**Parameterized mailers (Rails 5.1+):**
```ruby
class NotificationMailer < ApplicationMailer
  before_action { @account = params[:account] }

  def welcome
    mail(to: params[:user].email, subject: "Welcome to #{@account.name}")
  end
end

# Call with named params
NotificationMailer.with(account: account, user: user).welcome.deliver_later
```

**Testing mailers:**
```ruby
# spec/mailers/user_mailer_spec.rb
RSpec.describe UserMailer do
  describe "#welcome" do
    let(:user) { create(:user, email: "alice@example.com") }
    let(:mail) { described_class.welcome(user) }

    it "renders the correct subject" do
      expect(mail.subject).to eq("Welcome to Our App")
    end

    it "sends to the user's email" do
      expect(mail.to).to eq(["alice@example.com"])
    end

    it "includes the user's name in the body" do
      expect(mail.body.encoded).to include(user.name)
    end
  end

  # Test that deliver_later enqueues the job
  it "enqueues a delivery job" do
    user = create(:user)
    expect { UserMailer.welcome(user).deliver_later }
      .to have_enqueued_mail(UserMailer, :welcome).with(user)
  end
end
```

**Rule of thumb:** Always use `deliver_later` in web requests to avoid blocking. Create both HTML and plain-text views for every mailer. Use interceptors to prevent accidental emails in staging. Use mailer previews during development instead of sending real emails. Keep mailers thin -- put complex logic in service objects, not in the mailer itself.
