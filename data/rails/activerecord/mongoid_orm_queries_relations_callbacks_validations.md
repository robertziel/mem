### Mongoid ORM with Rails (Queries, Relations, Callbacks, Validations)

**Setup:**
```ruby
# Gemfile
gem 'mongoid', '~> 8.0'

# Generate config
# rails g mongoid:config → creates config/mongoid.yml

# config/mongoid.yml
development:
  clients:
    default:
      database: myapp_development
      hosts:
        - localhost:27017
      options:
        server_selection_timeout: 5
        max_pool_size: 10
```

**Model definition (no migrations needed):**
```ruby
class User
  include Mongoid::Document
  include Mongoid::Timestamps  # created_at, updated_at

  # Fields (explicit — MongoDB is schemaless but Mongoid wants declarations)
  field :name,        type: String
  field :email,       type: String
  field :age,         type: Integer
  field :active,      type: Boolean, default: true
  field :tags,        type: Array,   default: []
  field :metadata,    type: Hash,    default: {}
  field :score,       type: Float
  field :role,        type: String,  default: "user"
  field :last_login,  type: DateTime

  # Indexes (applied via rake db:mongoid:create_indexes)
  index({ email: 1 }, { unique: true })
  index({ active: 1, created_at: -1 })
  index({ tags: 1 })                      # multikey index for array field
  index({ "metadata.source" => 1 })       # index on nested hash field

  # Validations (same as ActiveRecord)
  validates :name,  presence: true
  validates :email, presence: true, uniqueness: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :role,  inclusion: { in: %w[user admin moderator] }
  validates :age,   numericality: { greater_than: 0 }, allow_nil: true
end
```

**Embedded documents (1:1 and 1:many, stored inside parent):**
```ruby
class User
  include Mongoid::Document
  embeds_one  :profile               # 1:1 subdocument
  embeds_many :addresses             # 1:many subdocuments
  # Data is stored INSIDE the user document in MongoDB
end

class Profile
  include Mongoid::Document
  embedded_in :user
  field :bio,    type: String
  field :avatar, type: String
end

class Address
  include Mongoid::Document
  embedded_in :user
  field :street, type: String
  field :city,   type: String
  field :zip,    type: String
  validates :city, presence: true
end

# Usage
user = User.create!(name: "Jan", email: "jan@x.com")
user.create_profile(bio: "Developer")
user.addresses.create!(street: "Marszałkowska 1", city: "Warsaw", zip: "00-001")

# Atomic update on embedded docs
user.addresses.where(city: "Warsaw").update_all(zip: "00-002")
```

**Referenced relations (separate collections, like ActiveRecord):**
```ruby
class User
  include Mongoid::Document
  has_many   :posts,    dependent: :destroy
  has_many   :comments, dependent: :destroy
  has_one    :subscription
  has_and_belongs_to_many :roles  # stores array of IDs in both docs
end

class Post
  include Mongoid::Document
  belongs_to :user
  has_many   :comments, dependent: :destroy
  field :title, type: String
  field :body,  type: String
  index({ user_id: 1, created_at: -1 })
end

class Comment
  include Mongoid::Document
  belongs_to :user
  belongs_to :post
  field :body, type: String
end
```

**Querying (Criteria API — chainable like ActiveRecord):**
```ruby
# Basic queries
User.where(active: true)
User.where(:age.gte => 18)
User.where(:age.gte => 18, :age.lte => 65)
User.where(role: "admin").or(role: "moderator")
User.not(role: "banned")
User.in(role: ["admin", "moderator"])
User.where(:tags.in => ["ruby", "rails"])  # array contains any of

# Regex
User.where(name: /^Jan/i)

# Nested hash fields
User.where("metadata.source" => "api")

# Sorting, limiting, offsetting
User.order_by(created_at: :desc).limit(20).skip(40)

# Select / pluck (reduce data transferred)
User.only(:name, :email)          # include only these fields
User.without(:metadata)           # exclude field
User.pluck(:email)                # returns array of values

# Count, exists, distinct
User.where(active: true).count
User.where(email: "jan@x.com").exists?
User.distinct(:role)              # unique values

# First, last, find
User.first
User.last
User.find("64a7f...")             # by _id
User.find_by(email: "jan@x.com") # first match or raise

# Aggregation via Mongoid
User.collection.aggregate([
  { "$match" => { active: true } },
  { "$group" => { "_id" => "$role", "count" => { "$sum" => 1 } } }
])
```

**Scopes:**
```ruby
class Post
  include Mongoid::Document

  scope :published,  -> { where(status: "published") }
  scope :recent,     -> { order_by(created_at: :desc).limit(10) }
  scope :by_author,  ->(user_id) { where(user_id: user_id) }
  scope :tagged,     ->(tag) { where(:tags.in => [tag]) }
end

Post.published.recent.tagged("mongodb")
```

**Callbacks:**
```ruby
class Order
  include Mongoid::Document

  before_validation :normalize_status
  before_create     :generate_order_number
  after_create      :send_confirmation
  before_save       :calculate_total
  after_save        :update_inventory
  before_destroy    :check_cancellable

  # around callbacks also available
  around_save :log_changes

  private

  def log_changes
    old_attrs = changes.dup
    yield  # actual save
    Rails.logger.info("Order #{id} changed: #{old_attrs}")
  end
end
```

**Atomic operations (update without loading):**
```ruby
# Increment
user.inc(login_count: 1)

# Push to array
user.push(tags: "mongodb")
user.add_to_set(tags: "mongodb")  # only if not already present

# Pull from array
user.pull(tags: "old_tag")

# Set specific fields
user.set(last_login: Time.current)

# Unset field (remove from document)
user.unset(:deprecated_field)

# Bulk atomic update
User.where(active: false).update_all("$set" => { archived: true })
```

**Differences from ActiveRecord:**

| Feature | ActiveRecord | Mongoid |
|---------|-------------|---------|
| Schema | Migrations required | No migrations, fields in model |
| IDs | Integer auto-increment | BSON ObjectId (string) |
| Joins | SQL JOIN | `$lookup` or eager load |
| Transactions | Full ACID | Multi-doc transactions (4.0+) |
| Embedded docs | Not native | First-class (embeds_one/many) |
| Schemaless fields | No | `store_in`, dynamic attributes |
| Array fields | Requires separate table | Native array type |
| Indexes | In migrations | In model, apply via rake task |

**Applying indexes:**
```bash
# Create all indexes defined in models
rake db:mongoid:create_indexes

# Remove undefined indexes (cleanup)
rake db:mongoid:remove_undefined_indexes
```

**Rule of thumb:** Use embeds for data always accessed together (address in user). Use has_many/belongs_to for independent entities. Define field types explicitly for safety. Use atomic operations (inc, push, set) instead of load-modify-save for concurrent safety. Apply indexes with rake task — they're defined in models, not migrations. Use `only/without` to avoid transferring unnecessary data.
