### Clean Architecture (Layers & Dependency Rule)

**Layers (inner to outer):**
1. **Entities** — business objects, domain rules (pure, no dependencies)
2. **Use Cases** — application logic (orchestrate entities)
3. **Interface Adapters** — convert between use case and external format
4. **Frameworks & Drivers** — web framework, database, external services

**Dependency Rule:** source code dependencies only point INWARD. Inner layers don't know about outer layers.

**In Rails context:**
```
app/
  domain/           # Entities (pure Ruby, no Rails)
    order.rb
    money.rb
  use_cases/        # Application logic
    place_order.rb
  adapters/          # Infrastructure
    postgres_order_repo.rb
    stripe_payment_gateway.rb
  controllers/       # HTTP adapter (thin)
    orders_controller.rb
```

**Pragmatic approach:**
- Full clean architecture is overkill for most Rails apps
- Start simple: fat models → service objects → ports when needed
- Apply at boundaries: third-party integrations, complex domain logic

**Rule of thumb:** Architecture should serve productivity, not the other way around. In Rails, start with service objects and extract further only when complexity justifies it. Full clean architecture for large teams, complex domains, or long-lived codebases.
