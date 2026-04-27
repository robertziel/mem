### Rails Deployment: Capistrano (Traditional SSH)

```ruby
# Gemfile
gem 'capistrano', '~> 3.0'
gem 'capistrano-rails'
gem 'capistrano-rbenv'
gem 'capistrano-puma'

# config/deploy.rb
set :application, "myapp"
set :repo_url, "git@github.com:org/myapp.git"
set :deploy_to, "/var/www/myapp"
set :branch, "main"

# config/deploy/production.rb
server "1.2.3.4", user: "deploy", roles: %w[app db web]
```

```bash
cap production deploy         # deploy to production
cap production deploy:rollback  # rollback
cap production rails:console  # remote console
```

**How it works:**
- SSH to servers, git pull, symlink release, restart app
- Keeps N releases for instant rollback
- Shared dirs: uploads, logs, config (symlinked across releases)

**Rule of thumb:** Capistrano for non-Docker deployments on existing infrastructure. Being replaced by Kamal for new projects. Still works well for traditional server setups.
