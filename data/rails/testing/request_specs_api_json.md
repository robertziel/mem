### Request Specs: API & JSON Endpoint Testing

**Request specs (API/controller testing without a browser):**
```ruby
# spec/requests/api/posts_spec.rb
RSpec.describe "Posts API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { { "Authorization" => "Bearer #{user.auth_token}", "Content-Type" => "application/json" } }

  describe "GET /api/posts" do
    it "returns a list of posts" do
      create_list(:post, 3, user: user)

      get "/api/posts", headers: headers

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["posts"].length).to eq(3)
    end

    it "returns 401 without authentication" do
      get "/api/posts"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/posts" do
    let(:valid_params) { { post: { title: "Hello", body: "World" } }.to_json }

    it "creates a new post" do
      expect {
        post "/api/posts", params: valid_params, headers: headers
      }.to change(Post, :count).by(1)

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["post"]["title"]).to eq("Hello")
    end

    it "returns validation errors" do
      invalid = { post: { title: "", body: "" } }.to_json
      post "/api/posts", params: invalid, headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to include("Title can't be blank")
    end
  end

  describe "PUT /api/posts/:id" do
    let(:existing_post) { create(:post, user: user) }

    it "updates the post" do
      params = { post: { title: "Updated" } }.to_json
      put "/api/posts/#{existing_post.id}", params: params, headers: headers

      expect(response).to have_http_status(:ok)
      expect(existing_post.reload.title).to eq("Updated")
    end
  end

  describe "DELETE /api/posts/:id" do
    it "deletes the post" do
      existing_post = create(:post, user: user)

      expect {
        delete "/api/posts/#{existing_post.id}", headers: headers
      }.to change(Post, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
```

**Testing JSON response helpers:**
```ruby
# spec/support/json_helpers.rb
module JsonHelpers
  def json_response
    JSON.parse(response.body, symbolize_names: true)
  end

  def json_data
    json_response[:data]
  end
end

RSpec.configure do |config|
  config.include JsonHelpers, type: :request
end

# Usage in specs
it "returns the post" do
  get "/api/posts/#{post.id}", headers: headers
  expect(json_response[:title]).to eq("Hello")
end
```

**Authentication helpers for request specs:**
```ruby
# spec/support/auth_helpers.rb
module AuthHelpers
  # For request specs (API)
  def auth_headers(user)
    token = JwtService.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}", "Content-Type" => "application/json" }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end

# With Devise (request specs)
RSpec.configure do |config|
  config.include Devise::Test::IntegrationHelpers, type: :request
end

# Usage: sign_in(user) -- Devise helper, no browser interaction needed
```

**Request specs vs system specs:**
| Feature | Request specs | System specs |
|---------|---------------|--------------|
| Type | `type: :request` | `type: :system` |
| Browser | No (direct HTTP) | Yes (Capybara + Chrome) |
| Speed | Fast | Slower |
| JavaScript | No | Yes |
| Test focus | API responses, status codes, JSON | UI flows, user interaction |
| Methods | `get`, `post`, `put`, `delete` | `visit`, `fill_in`, `click_button` |
| Auth | Token in headers | Log in through UI (or Devise helper) |
| Use for | APIs, JSON endpoints, redirects | Full user journeys, JS features |

**Rule of thumb:** Use request specs for all API endpoints -- they are fast and test the full middleware stack including routing, controllers, and serialization. Create shared JSON helpers to avoid repetitive `JSON.parse` calls. Use auth helper modules to keep authentication DRY across specs. Request specs should be your primary tool for testing any non-browser endpoint.
