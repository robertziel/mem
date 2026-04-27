### ActiveRecord Validations

**Built-in validators:**
```ruby
class User < ApplicationRecord
  validates :name, presence: true
  validates :email, presence: true,
                    uniqueness: { case_sensitive: false },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :age, numericality: { greater_than_or_equal_to: 18 }
  validates :username, length: { minimum: 3, maximum: 30 },
                       format: { with: /\A[a-z0-9_]+\z/ }
  validates :role, inclusion: { in: %w[admin editor viewer] }
  validates :terms, acceptance: true
  validates :password, confirmation: true  # must match password_confirmation
end
```

**Conditional validations:**
```ruby
validates :company_name, presence: true, if: :business_account?
validates :phone, presence: true, unless: -> { email.present? }
validates :bio, length: { maximum: 500 }, on: :update  # only on update, not create
```

**Custom validator (reusable):**
```ruby
class EmailDomainValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return if value.blank?
    domain = value.split("@").last
    unless options[:allowed_domains].include?(domain)
      record.errors.add(attribute, "must be from an allowed domain")
    end
  end
end

class User < ApplicationRecord
  validates :email, email_domain: { allowed_domains: ["company.com"] }
end
```

**Custom validation method:**
```ruby
class Order < ApplicationRecord
  validate :delivery_date_in_future

  private

  def delivery_date_in_future
    if delivery_date.present? && delivery_date <= Date.today
      errors.add(:delivery_date, "must be in the future")
    end
  end
end
```

**Uniqueness race condition:**
```ruby
# validates :email, uniqueness: true
# This does SELECT then INSERT — NOT atomic!
# Two requests can both SELECT (no duplicate), both INSERT → duplicate!

# Solution: ALWAYS pair with database unique index
add_index :users, :email, unique: true

# Handle the race condition in code:
begin
  user.save!
rescue ActiveRecord::RecordNotUnique
  user.errors.add(:email, "has already been taken")
end
```

**Working with errors:**
```ruby
user.valid?                    # run validations, return true/false
user.errors.full_messages      # ["Email can't be blank", "Name is too short"]
user.errors[:email]            # ["can't be blank", "is invalid"]
user.errors.add(:base, "Something went wrong")  # non-attribute error

# In API response
render json: { errors: user.errors }, status: :unprocessable_entity
```

**Skipping validations (use carefully):**
```ruby
user.save(validate: false)        # skip all validations
user.update_column(:email, value) # skip validations AND callbacks
User.insert_all([...])            # bulk insert, no validations
```

**Rule of thumb:** Always pair `uniqueness` validation with a DB unique index (race condition). Use conditional validations to keep models flexible. Custom validators for reusable logic across models. Never skip validations in application code unless you have a very specific reason (data migrations).
