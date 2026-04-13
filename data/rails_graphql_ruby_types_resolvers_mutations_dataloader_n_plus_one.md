### GraphQL with graphql-ruby

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

**Mutations:**
```ruby
# app/graphql/mutations/create_post.rb
module Mutations
  class CreatePost < Mutations::BaseMutation
    argument :title, String, required: true
    argument :body, String, required: true
    argument :published, Boolean, required: false, default_value: false

    field :post, Types::PostType, null: true
    field :errors, [String], null: false

    def resolve(title:, body:, published:)
      post = context[:current_user].posts.build(
        title: title,
        body: body,
        published: published
      )

      if post.save
        { post: post, errors: [] }
      else
        { post: nil, errors: post.errors.full_messages }
      end
    end
  end
end

# app/graphql/types/mutation_type.rb
module Types
  class MutationType < Types::BaseObject
    field :create_post, mutation: Mutations::CreatePost
    field :update_post, mutation: Mutations::UpdatePost
    field :delete_post, mutation: Mutations::DeletePost
  end
end
```

**Subscriptions (real-time via Action Cable):**
```ruby
# app/graphql/types/subscription_type.rb
module Types
  class SubscriptionType < Types::BaseObject
    field :post_created, Types::PostType, null: false do
      argument :author_id, ID, required: false
    end

    def post_created(author_id: nil)
      object  # return the triggered object
    end
  end
end

# Trigger from application code
MySchema.subscriptions.trigger(:post_created, { author_id: post.author_id }, post)
```

**GraphQL::Dataloader (batching to prevent N+1):**
```ruby
# The #1 performance issue in GraphQL is N+1 queries
# GraphQL::Dataloader batches database lookups

# app/graphql/sources/record_source.rb
class Sources::RecordSource < GraphQL::Dataloader::Source
  def initialize(model_class)
    @model_class = model_class
  end

  def fetch(ids)
    records = @model_class.where(id: ids).index_by(&:id)
    ids.map { |id| records[id] }
  end
end

# app/graphql/sources/association_source.rb
class Sources::AssociationSource < GraphQL::Dataloader::Source
  def initialize(model_class, association_name)
    @model_class = model_class
    @association_name = association_name
  end

  def fetch(records)
    ActiveRecord::Associations::Preloader.new(
      records: records,
      associations: @association_name
    ).call
    records.map { |r| r.public_send(@association_name) }
  end
end

# Use in type definitions
class Types::PostType < Types::BaseObject
  field :author, Types::UserType, null: false

  def author
    dataloader.with(Sources::RecordSource, User).load(object.author_id)
  end

  field :comments, [Types::CommentType], null: false

  def comments
    dataloader.with(Sources::AssociationSource, Post, :comments).load(object)
  end
end

# Enable in schema
class MySchema < GraphQL::Schema
  use GraphQL::Dataloader
end
```

**N+1 prevention comparison:**
| Approach | How | Tradeoff |
|----------|-----|----------|
| GraphQL::Dataloader | Batch loads by source | Built-in, recommended |
| graphql-batch (Shopify) | Promise-based batching | Mature, more verbose |
| Eager loading in resolver | `includes(:association)` | Simple, but overfetches |
| lookahead | Check requested fields, load conditionally | Fine-grained control |

**Authentication and authorization:**
```ruby
# Authentication: set current_user in context
# app/controllers/graphql_controller.rb
class GraphqlController < ApplicationController
  def execute
    context = {
      current_user: current_user,
      session: session
    }
    result = MySchema.execute(params[:query],
      variables: params[:variables],
      context: context,
      operation_name: params[:operationName]
    )
    render json: result
  end
end

# Authorization: field-level visibility
class Types::UserType < Types::BaseObject
  field :email, String, null: false

  def email
    if context[:current_user]&.admin? || context[:current_user] == object
      object.email
    else
      nil
    end
  end

  # Or use the authorized? hook
  def self.authorized?(object, context)
    context[:current_user].present?
  end
end

# With pundit-style policies (graphql-ruby built-in)
class Types::BaseObject < GraphQL::Schema::Object
  def self.authorized?(object, context)
    super && context[:current_user].present?
  end
end
```

**Schema definition and routing:**
```ruby
# app/graphql/my_schema.rb
class MySchema < GraphQL::Schema
  mutation(Types::MutationType)
  query(Types::QueryType)
  subscription(Types::SubscriptionType)
  use GraphQL::Dataloader

  max_complexity 300   # prevent overly complex queries
  max_depth 10         # prevent deeply nested queries

  rescue_from(ActiveRecord::RecordNotFound) do |_err, _obj, _args, _ctx, field|
    raise GraphQL::ExecutionError, "#{field.type.unwrap.graphql_name} not found"
  end
end

# config/routes.rb
post "/graphql", to: "graphql#execute"
mount GraphiQL::Rails::Engine, at: "/graphiql", graphql_path: "/graphql" if Rails.env.development?
```

**Rule of thumb:** Use GraphQL::Dataloader from the start to prevent N+1 queries -- they are inevitable in GraphQL without batching. Keep mutations thin (delegate to service objects). Use field-level authorization for sensitive data. Set `max_depth` and `max_complexity` to prevent abuse. Use resolver classes for complex queries. Test with request specs hitting the `/graphql` endpoint, not by calling resolvers directly.
