### Active Storage: File Uploads in Rails

**Setup:**
```ruby
# Install Active Storage
$ bin/rails active_storage:install
$ bin/rails db:migrate
# Creates: active_storage_blobs, active_storage_attachments, active_storage_variant_records
```

**Attaching files to models:**
```ruby
class User < ApplicationRecord
  has_one_attached :avatar           # single file
  has_many_attached :documents       # multiple files
end

class Product < ApplicationRecord
  has_one_attached :featured_image
  has_many_attached :photos
end
```

**Attaching files in controllers:**
```ruby
class UsersController < ApplicationController
  def update
    @user = User.find(params[:id])
    @user.avatar.attach(params[:user][:avatar])
    # or via update:
    @user.update(user_params)
  end

  private

  def user_params
    params.require(:user).permit(:name, :avatar, documents: [])
  end
end
```

**Querying and checking attachments:**
```ruby
user.avatar.attached?              # true/false
user.avatar.filename               # => "photo.jpg"
user.avatar.content_type           # => "image/jpeg"
user.avatar.byte_size              # => 2048576

# URL generation
url_for(user.avatar)                              # redirects through app
rails_blob_path(user.avatar, disposition: "attachment")  # force download

# Eager loading to avoid N+1
User.with_attached_avatar           # includes blob + attachment
User.with_attached_documents

# Purge (delete)
user.avatar.purge            # delete synchronously
user.avatar.purge_later      # delete via ActiveJob (preferred)
```

**Image variants (on-the-fly transformations):**
```ruby
# Gemfile: gem "image_processing", "~> 1.2"

# Generate resized variants
user.avatar.variant(resize_to_limit: [300, 300])              # max 300x300
user.avatar.variant(resize_to_fill: [150, 150])               # crop to 150x150
user.avatar.variant(resize_to_fit: [200, 200])                # fit within 200x200
user.avatar.variant(resize_to_limit: [800, 800]).processed    # process immediately

# In views
<%= image_tag user.avatar.variant(resize_to_fill: [100, 100]) %>

# Chained transformations
user.avatar.variant(
  resize_to_fill: [400, 400],
  format: :webp,
  saver: { quality: 80 }
)

# Preview for non-image files (PDFs, videos)
document.preview(resize_to_limit: [300, 300])  # requires poppler/ffmpeg
```

**Direct uploads (client-to-cloud, bypasses server):**
```ruby
# In your form (Rails auto-injects JS for direct upload)
<%= form.file_field :avatar, direct_upload: true %>

# JavaScript hooks for progress
addEventListener("direct-upload:progress", (event) => {
  const { progress } = event.detail
  // Update progress bar
})
```

**Storage backends (S3, GCS, Azure, local disk):**
```yaml
# config/storage.yml
local:
  service: Disk
  root: <%= Rails.root.join("storage") %>

amazon:
  service: S3
  access_key_id: <%= Rails.application.credentials.dig(:aws, :access_key_id) %>
  secret_access_key: <%= Rails.application.credentials.dig(:aws, :secret_access_key) %>
  region: us-east-1
  bucket: my-app-production

google:
  service: GCS
  project: my-project
  credentials: <%= Rails.root.join("config/gcs_keyfile.json") %>
  bucket: my-app-production

mirror:
  service: Mirror
  primary: amazon
  mirrors:
    - google
```

```ruby
# config/environments/production.rb
config.active_storage.service = :amazon

# config/environments/development.rb
config.active_storage.service = :local
```

**Validations (use activestorage-validator or custom):**
```ruby
# Gemfile: gem "active_storage_validations"
class User < ApplicationRecord
  has_one_attached :avatar

  validates :avatar,
    content_type: ["image/png", "image/jpeg", "image/webp"],
    size: { less_than: 5.megabytes }
end

# Or custom validation
class User < ApplicationRecord
  has_one_attached :avatar
  validate :acceptable_avatar

  private

  def acceptable_avatar
    return unless avatar.attached?

    unless avatar.content_type.in?(%w[image/png image/jpeg])
      errors.add(:avatar, "must be a PNG or JPEG")
    end

    if avatar.byte_size > 5.megabytes
      errors.add(:avatar, "is too large (max 5 MB)")
    end
  end
end
```

**Common patterns:**
| Task | Method |
|------|--------|
| Attach a file | `model.file.attach(io: File.open(...), filename: "x.pdf")` |
| Check if attached | `model.file.attached?` |
| Get URL | `url_for(model.file)` or `rails_blob_url(model.file)` |
| Resize image | `model.image.variant(resize_to_limit: [w, h])` |
| Delete file | `model.file.purge_later` |
| Eager load | `Model.with_attached_file` |
| Direct upload | `file_field :file, direct_upload: true` |

**Rule of thumb:** Use `has_one_attached` for single files, `has_many_attached` for collections. Always validate content type and file size. Use `variant` for image resizing (never store multiple sizes manually). Use direct uploads for large files to avoid tying up server processes. Use `purge_later` over `purge` in web requests. In production, always use a cloud backend (S3, GCS) -- never local disk.
