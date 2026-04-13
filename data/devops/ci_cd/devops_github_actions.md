### GitHub Actions

**Workflow structure:**
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test               # depends on test job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t myapp:${{ github.sha }} .

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456:role/github-actions
          aws-region: us-east-1

      - run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker push $ECR_REGISTRY/myapp:${{ github.sha }}
```

**Key concepts:**
- **Trigger (on):** push, pull_request, schedule, workflow_dispatch (manual), release
- **Jobs:** run in parallel by default, `needs` creates dependencies
- **Steps:** sequential within a job, can use actions or run commands
- **Matrix:** run same job with different configs

**Matrix strategy:**
```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, macos-latest]
```

**Caching:**
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: ${{ runner.os }}-npm-
```

**Secrets and variables:**
```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}           # encrypted secrets
  APP_ENV: ${{ vars.APP_ENV }}              # plain variables
```

**Reusable workflows:**
```yaml
# Call a reusable workflow
jobs:
  deploy:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: production
    secrets: inherit
```

**Useful contexts:**
- `github.sha` - commit SHA
- `github.ref_name` - branch or tag name
- `github.event.pull_request.number` - PR number
- `github.actor` - user who triggered

**Rule of thumb:** Pin action versions to SHA or major version. Use OIDC for cloud auth (not long-lived keys). Cache aggressively. Use `permissions` to restrict token scope. Use reusable workflows to DRY up pipelines.
