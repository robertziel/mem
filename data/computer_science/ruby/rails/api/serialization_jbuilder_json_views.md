### Rails JSON Serialization: Jbuilder

```ruby
# app/views/posts/show.json.jbuilder (Rails default)
json.id @post.id
json.title @post.title
json.body @post.body
json.author do
  json.id @post.user.id
  json.name @post.user.name
end
json.comments @post.comments do |comment|
  json.id comment.id
  json.body comment.body
end
```

- Template-based (DSL in view files)
- Rails default, zero setup
- Slowest option (template rendering overhead)
- Good for: simple views, server-rendered JSON

**Rule of thumb:** Jbuilder for simple apps. For APIs with performance requirements, switch to Blueprinter or Alba.
