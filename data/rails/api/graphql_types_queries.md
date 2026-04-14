### GraphQL Types and Query Resolvers

**Setup:**
```ruby
# Gemfile
gem "graphql"

# Generate boilerplate
$ bin/rails generate graphql:install
# Creates: app/graphql/ directory with schema, types, mutations
```

**Defining types:**
```ruby
# app/graphql/types/user_type.rb
module Types
  class UserType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :email, String, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false

    # Computed field
    field :full_name, String, null: false
    def full_name
      "#{object.first_name} #{object.last_name}"
    end

    # Association fields
    field :posts, [Types::PostType], null: false
    field :posts_count, Integer, null: false
    def posts_count
      object.posts.size
    end
  end
end

# app/graphql/types/post_type.rb
module Types
  class PostType < Types::BaseObject
    field :id, ID, null: false
    field :title, String, null: false
    field :body, String, null: false
    field :author, Types::UserType, null: false
    field :comments, [Types::CommentType], null: false
    field :published, Boolean, null: false
  end
end
```

**Query resolvers:**
```ruby
# app/graphql/types/query_type.rb
module Types
  class QueryType < Types::BaseObject
    # Single record
    field :user, Types::UserType, null: true do
      argument :id, ID, required: true
    end

    def user(id:)
      User.find_by(id: id)
    end

    # Collection with pagination
    field :posts, Types::PostType.connection_type, null: false do
      argument :published, Boolean, required: false
    end

    def posts(published: nil)
      scope = Post.all
      scope = scope.where(published: published) unless published.nil?
      scope.order(created_at: :desc)
    end
  end
end

# Using a dedicated resolver class
# app/graphql/resolvers/posts_resolver.rb
module Resolvers
  class PostsResolver < Resolvers::BaseResolver
    type [Types::PostType], null: false

    argument :published, Boolean, required: false
    argument :author_id, ID, required: false

    def resolve(published: nil, author_id: nil)
      scope = Post.all
      scope = scope.where(published: published) unless published.nil?
      scope = scope.where(author_id: author_id) if author_id
      scope.order(created_at: :desc)
    end
  end
end

# Wire up in query type
field :posts, resolver: Resolvers::PostsResolver
```

**Rule of thumb:** Define one ObjectType per model with explicit `null:` annotations on every field. Use computed fields for derived data. Use dedicated resolver classes for complex queries with multiple arguments and filtering logic -- keep the QueryType file as a clean index of available queries.
