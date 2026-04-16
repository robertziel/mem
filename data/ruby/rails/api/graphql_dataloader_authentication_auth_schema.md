### GraphQL Dataloader, Authentication, and Schema

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

**Rule of thumb:** Use GraphQL::Dataloader from the start to prevent N+1 queries -- they are inevitable in GraphQL without batching. Pass current_user via context for authentication, and use field-level `authorized?` hooks for authorization. Set `max_depth` and `max_complexity` on the schema to prevent abuse.
