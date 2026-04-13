### ActiveSupport Core Extensions

**present? / blank? / presence:**
```ruby
# blank? — true for nil, false, "", " ", [], {}
nil.blank?       # true
"".blank?        # true
"  ".blank?      # true
[].blank?        # true
false.blank?     # true
0.blank?         # false (numbers are never blank)
"hello".blank?   # false

# present? — opposite of blank?
"hello".present? # true
nil.present?     # false
[1].present?     # true

# presence — returns self if present?, otherwise nil
# Eliminates the common pattern: value.present? ? value : nil
params[:name].presence || "Anonymous"
user.middle_name.presence   # nil if blank, value if present

# Before presence:
name = params[:name]
name = nil if name.blank?
# After:
name = params[:name].presence
```

**try / try!:**
```ruby
# try — calls method if receiver is not nil, returns nil otherwise
user = nil
user.try(:name)          # nil (no NoMethodError)
user.try(:name, :upcase) # nil

user = User.new(name: "Alice")
user.try(:name)          # "Alice"

# try with block
user.try { |u| u.name.upcase }  # "ALICE" or nil if user is nil

# try! — calls method, raises NoMethodError if method doesn't exist
user.try!(:nonexistent)  # NoMethodError
user.try(:nonexistent)   # nil (silently ignores)

# Safe navigation (&.) is now preferred over try for simple cases:
user&.name          # same as user.try(:name)
user&.name&.upcase  # same as user.try(:name).try(:upcase)

# try is still useful for dynamic method names:
user.try(method_name)
```

**delegate:**
```ruby
class Order < ApplicationRecord
  belongs_to :customer

  # Generates: def name; customer.name; end
  delegate :name, :email, to: :customer

  # With prefix (generates customer_name, customer_email)
  delegate :name, :email, to: :customer, prefix: true

  # Custom prefix
  delegate :name, to: :customer, prefix: :buyer  # buyer_name

  # Allow nil (returns nil instead of NoMethodError when customer is nil)
  delegate :name, to: :customer, allow_nil: true

  # Delegate to class
  delegate :tax_rate, to: :class
end

order = Order.new(customer: Customer.new(name: "Alice"))
order.name           # "Alice" (delegated)
order.customer_name  # "Alice" (prefixed)
```

**mattr_accessor / cattr_accessor:**
```ruby
# Module-level accessors (like attr_accessor but for modules/classes)
module MyConfig
  mattr_accessor :api_key
  mattr_accessor :timeout, default: 30
  mattr_accessor :debug, default: false

  mattr_reader :version   # read-only
  mattr_writer :secret    # write-only
end

MyConfig.api_key = "abc123"
MyConfig.api_key    # "abc123"
MyConfig.timeout    # 30 (default)

# cattr_accessor is the same thing for classes
class AppConfig
  cattr_accessor :site_name, default: "My App"
end

AppConfig.site_name  # "My App"
```

**Time extensions:**
```ruby
# Duration objects
2.days                  # 2 days (ActiveSupport::Duration)
3.hours                 # 3 hours
45.minutes              # 45 minutes
1.week                  # 1 week
6.months                # 6 months
1.year                  # 1 year

# Ago / from_now
2.days.ago              # 2 days before Time.current
1.hour.from_now         # 1 hour after Time.current
3.weeks.ago             # 3 weeks before Time.current
30.minutes.from_now     # 30 minutes after Time.current

# Arithmetic with time
Time.current + 2.hours
Time.current - 1.day
Date.today + 3.months
Date.today.beginning_of_month
Date.today.end_of_week

# Time helpers on Date/Time
Time.current.beginning_of_day   # 00:00:00 today
Time.current.end_of_day         # 23:59:59 today
Time.current.beginning_of_week  # Monday 00:00:00
Date.today.next_occurring(:friday)

# In queries
User.where("created_at > ?", 7.days.ago)
Order.where(placed_at: 1.month.ago..Time.current)
```

**HashWithIndifferentAccess:**
```ruby
# Access hash with either string or symbol keys
hash = ActiveSupport::HashWithIndifferentAccess.new
hash[:name] = "Alice"
hash["name"]    # "Alice"
hash[:name]     # "Alice"

# Convert a regular hash
regular = { "name" => "Alice", "age" => 30 }
indifferent = regular.with_indifferent_access
indifferent[:name]    # "Alice"
indifferent["name"]   # "Alice"

# Rails params are already HashWithIndifferentAccess
params[:user]         # same as params["user"]

# Careful: symbolize_keys is different
hash = { "a" => 1 }.symbolize_keys  # { a: 1 } (regular hash)
```

**String inflections:**
```ruby
# pluralize / singularize
"post".pluralize       # "posts"
"person".pluralize     # "people"
"octopus".pluralize    # "octopi"
"posts".singularize    # "post"

# classify (table name to class name)
"posts".classify       # "Post"
"line_items".classify  # "LineItem"

# tableize (class name to table name)
"LineItem".tableize    # "line_items"

# underscore / camelize
"MyModule::MyClass".underscore  # "my_module/my_class"
"first_name".camelize           # "FirstName"
"first_name".camelize(:lower)   # "firstName"

# titleize / humanize
"first_name".titleize    # "First Name"
"author_id".humanize     # "Author"
"employee_salary".humanize  # "Employee salary"

# constantize / safe_constantize
"User".constantize           # User (the class)
"NonExistent".safe_constantize  # nil (no error)

# parameterize (URL-safe slugs)
"Hello World & Goodbye".parameterize  # "hello-world-goodbye"

# truncate
"A very long string".truncate(10)  # "A very ..."
```

**Other useful extensions:**
```ruby
# Numeric
1.ordinalize        # "1st"
2.ordinalize        # "2nd"
1_000.to_fs(:delimited)  # "1,000"

# Array
[1, 2, 3].to_sentence          # "1, 2, and 3"
[1, 1, 2, 3].excluding(1)      # [2, 3]
[1, 2, 3, 4, 5].in_groups_of(2)  # [[1, 2], [3, 4], [5, nil]]

# Hash
{ a: 1, b: 2, c: 3 }.except(:c)   # { a: 1, b: 2 }
{ a: 1, b: 2 }.reverse_merge(b: 0, c: 3)  # { a: 1, b: 2, c: 3 }
{ name: "Alice", role: "admin" }.slice(:name)  # { name: "Alice" }

# Object
1.in?([1, 2, 3])    # true
"a".in?("abc")       # true
```

**Quick reference:**
| Method | Purpose | Example |
|--------|---------|---------|
| blank? | nil, false, empty, whitespace | "".blank? => true |
| present? | opposite of blank? | "hi".present? => true |
| presence | self or nil | "".presence => nil |
| try | safe method call | nil.try(:name) => nil |
| delegate | forward methods | delegate :name, to: :user |
| mattr_accessor | module-level getter/setter | mattr_accessor :config |
| 2.days.ago | time arithmetic | Time.current - 2.days |
| with_indifferent_access | string/symbol keys | hash[:key] == hash["key"] |
| pluralize | inflection | "post".pluralize => "posts" |
| classify | table to class | "posts".classify => "Post" |

**Rule of thumb:** Use `presence` instead of `present? ? value : nil` patterns. Prefer `&.` (safe navigation) over `try` for simple nil-safe chaining, but use `try` for dynamic method names. Use `delegate` freely to keep the Law of Demeter. ActiveSupport's time extensions make date arithmetic readable -- always use `2.days.ago` over manual `Time.current - 172800`.
