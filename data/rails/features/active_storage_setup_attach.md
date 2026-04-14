### Active Storage: Setup & Attaching Files

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

**Rule of thumb:** Use `has_one_attached` for single files and `has_many_attached` for collections. Always permit array params (`documents: []`) for multiple uploads. Use `with_attached_*` scopes to eager load and avoid N+1 queries. Use `purge_later` over `purge` in web requests so file deletion happens in the background.
