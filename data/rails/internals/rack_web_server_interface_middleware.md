### What is Rack? (short)

**Rack** is the minimal Ruby webserver interface between a server and a Ruby web app.

- A Rack app responds to `call(env)` and returns `[status, headers, body]`.
- Rails, Sinatra, and others sit on top of Rack.

```ruby
app = ->(env) { [200, { "Content-Type" => "text/plain" }, ["OK"]] }
```

**Rule of thumb:** Rack is the common contract that lets servers and frameworks talk.
