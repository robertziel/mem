### Rails Deployment: Kamal (formerly MRSK)

**What Kamal does:**
- Deploy Docker containers to bare servers via SSH
- Rails default deployment tool since Rails 8.0
- Zero-downtime rolling deploys
- Built-in Traefik reverse proxy

```yaml
# config/deploy.yml
service: myapp
image: myapp

servers:
  web:
    hosts:
      - 1.2.3.4
      - 5.6.7.8
  worker:
    hosts:
      - 5.6.7.8
    cmd: bundle exec sidekiq

registry:
  username: user
  password:
    - KAMAL_REGISTRY_PASSWORD

env:
  secret:
    - RAILS_MASTER_KEY
    - DATABASE_URL
```

```bash
kamal setup     # first-time server setup
kamal deploy    # build, push, deploy
kamal rollback  # rollback to previous version
kamal app logs  # view logs
```

**Rule of thumb:** Kamal for new Rails projects deploying to your own servers. Gives Docker benefits without Kubernetes complexity. Replaces Capistrano for containerized deploys.
