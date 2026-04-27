### GraphQL Mutations and Subscriptions

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

**Rule of thumb:** Keep mutations thin -- delegate business logic to service objects and return the mutated record plus an errors array. Register all mutations in MutationType as a clean index. For subscriptions, use Action Cable as the transport and trigger events from models or service objects, not from controllers.
