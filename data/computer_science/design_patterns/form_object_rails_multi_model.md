### Form Object Pattern (Rails)

**What a Form Object is:**
- Encapsulates form validation for forms that don't map 1:1 to a model
- Combines validation + multi-model persistence in one class

```ruby
class RegistrationForm
  include ActiveModel::Model

  attr_accessor :name, :email, :password, :company_name

  validates :name, :email, :password, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8 }

  def save
    return false unless valid?
    ActiveRecord::Base.transaction do
      company = Company.create!(name: company_name)
      User.create!(name: name, email: email, password: password, company: company)
    end
  end
end

# Controller
def create
  @form = RegistrationForm.new(registration_params)
  if @form.save
    redirect_to dashboard_path
  else
    render :new
  end
end
```

**Rule of thumb:** Use Form Objects when a form creates/updates multiple models, or when validations are form-specific (not model-level). Includes `ActiveModel::Model` for validation, error handling, and form builder compatibility.
