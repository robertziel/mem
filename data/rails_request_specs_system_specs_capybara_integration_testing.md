### Request Specs, System Specs & Integration Testing

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

**System specs (browser-based E2E testing with Capybara):**
```ruby
# spec/system/user_login_spec.rb
RSpec.describe "User login", type: :system do
  let(:user) { create(:user, email: "alice@example.com", password: "password123") }

  it "logs in successfully" do
    visit login_path

    fill_in "Email", with: user.email
    fill_in "Password", with: "password123"
    click_button "Log in"

    expect(page).to have_content("Welcome, #{user.name}")
    expect(page).to have_current_path(dashboard_path)
  end

  it "shows an error for invalid credentials" do
    visit login_path

    fill_in "Email", with: user.email
    fill_in "Password", with: "wrong"
    click_button "Log in"

    expect(page).to have_content("Invalid email or password")
  end
end

# spec/system/post_management_spec.rb
RSpec.describe "Post management", type: :system do
  let(:user) { create(:user) }

  before { sign_in(user) }

  it "creates a new post" do
    visit new_post_path

    fill_in "Title", with: "My Post"
    fill_in "Body", with: "Post content here"
    select "Published", from: "Status"
    click_button "Create Post"

    expect(page).to have_content("Post was successfully created")
    expect(page).to have_content("My Post")
  end

  it "edits an existing post" do
    post = create(:post, user: user, title: "Old Title")
    visit edit_post_path(post)

    fill_in "Title", with: "New Title"
    click_button "Update Post"

    expect(page).to have_content("New Title")
  end
end
```

**Capybara DSL cheat sheet:**
```ruby
# Navigation
visit "/posts"
visit posts_path

# Finders
find("#post-1")
find(".post", text: "Hello")
find("input[name='post[title]']")
all(".post")  # returns array of elements

# Interaction
fill_in "Title", with: "Hello"          # fill input by label
fill_in "post[title]", with: "Hello"    # fill by name attribute
click_button "Submit"
click_link "Edit"
click_on "Submit"                        # button or link
check "Remember me"
uncheck "Subscribe"
choose "Option A"                        # radio button
select "Draft", from: "Status"
attach_file "Avatar", Rails.root.join("spec/fixtures/avatar.png")

# Assertions
expect(page).to have_content("Hello")
expect(page).to have_css(".success")
expect(page).to have_selector("h1", text: "Posts")
expect(page).to have_field("Title", with: "Hello")
expect(page).to have_button("Submit")
expect(page).to have_link("Edit")
expect(page).to have_current_path("/posts")
expect(page).not_to have_content("Error")

# Waiting (Capybara auto-waits by default)
expect(page).to have_content("Loaded", wait: 10)  # custom wait time

# Scoping
within("#post-form") do
  fill_in "Title", with: "Hello"
  click_button "Submit"
end

within_table("posts") do
  expect(page).to have_content("My Post")
end
```

**Headless Chrome setup:**
```ruby
# spec/support/capybara.rb
RSpec.configure do |config|
  config.before(:each, type: :system) do
    driven_by :selenium_chrome_headless
  end

  # Or with custom options
  config.before(:each, type: :system) do
    driven_by :selenium, using: :headless_chrome, screen_size: [1400, 900] do |options|
      options.add_argument("--disable-gpu")
      options.add_argument("--no-sandbox")
    end
  end
end

# For CI environments (GitHub Actions, CircleCI)
# Gemfile
gem "selenium-webdriver"
# No need for webdrivers gem in recent Selenium (auto-managed)
```

**Authentication helpers in tests:**
```ruby
# spec/support/auth_helpers.rb
module AuthHelpers
  # For system specs (browser-based)
  def sign_in(user)
    visit login_path
    fill_in "Email", with: user.email
    fill_in "Password", with: user.password
    click_button "Log in"
  end

  # For request specs (API)
  def auth_headers(user)
    token = JwtService.encode(user_id: user.id)
    { "Authorization" => "Bearer #{token}", "Content-Type" => "application/json" }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :system
  config.include AuthHelpers, type: :request
end

# With Devise (system specs)
RSpec.configure do |config|
  config.include Devise::Test::IntegrationHelpers, type: :system
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

**Testing Turbo and JavaScript interactions:**
```ruby
RSpec.describe "Live search", type: :system, js: true do
  it "filters results as user types" do
    create(:post, title: "Ruby Tutorial")
    create(:post, title: "Python Guide")

    visit posts_path
    fill_in "Search", with: "Ruby"

    expect(page).to have_content("Ruby Tutorial")
    expect(page).not_to have_content("Python Guide")
  end
end
```

**Rule of thumb:** Use request specs for all API endpoints -- they are fast and test the full middleware stack. Use system specs for critical user journeys (login, checkout, signup) and JavaScript-dependent features. Keep system specs focused on happy paths and key error flows (they are slow). Use headless Chrome for CI. Share authentication helpers between spec types. Use Capybara's built-in waiting instead of explicit sleeps.
