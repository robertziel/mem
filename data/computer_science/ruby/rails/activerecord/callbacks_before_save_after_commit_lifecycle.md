### Rails ActiveRecord Callbacks (Lifecycle, `after_save` vs `after_commit`)

**Definition:** callbacks are hooks Rails fires at specific moments in a record's lifecycle (validation, save, create, update, destroy, commit). Useful for small data-shaping logic; risky for complex flows or external side effects.

**Lifecycle order (full create + commit):**

```
1.  before_validation
2.  validate
3.  after_validation
4.  before_save
5.    before_create   (or before_update)
6.    INSERT/UPDATE   (DB write inside transaction)
7.    after_create   (or after_update)
8.  after_save
                  ← still inside the transaction
9.  COMMIT         (transaction finishes)
                  ← now we're outside the transaction
10. after_commit  (and after_create_commit / after_update_commit / after_destroy_commit)
```

**For `destroy`:**

```
before_destroy
  DELETE
after_destroy
COMMIT
after_commit (after_destroy_commit)
```

**For rollback:**

```
... → save fails → ROLLBACK → after_rollback fires (after_save / after_commit do NOT)
```

**Callbacks at a glance:**

| Phase | Callback | Runs |
|---|---|---|
| Validation | `before_validation`, `after_validation` | Always (unless `save(validate: false)`) |
| Save (any) | `before_save`, `after_save`, `around_save` | Inside transaction |
| Create | `before_create`, `after_create`, `around_create` | Inside transaction (only on insert) |
| Update | `before_update`, `after_update`, `around_update` | Inside transaction (only on update) |
| Destroy | `before_destroy`, `after_destroy`, `around_destroy` | Inside transaction |
| **Commit** | `after_commit`, `after_create_commit`, `after_update_commit`, `after_destroy_commit`, `after_save_commit` | **After** transaction commits |
| Rollback | `after_rollback` | Only if the transaction rolled back |
| Initialize / find | `after_initialize`, `after_find` | Object lifecycle (not DB) |

**`after_save` vs `after_commit` — the central distinction:**

| | `after_save` | `after_commit` |
|---|---|---|
| Runs inside the DB transaction | ✅ | ❌ — runs after the transaction commits |
| Visible to other connections | ❌ until commit | ✅ |
| Rollback skips it? | Yes — if transaction rolls back, after_save's effects (DB-side) roll back too | The callback itself doesn't fire on rollback |
| Use for **DB writes that depend on the new ID / state** | `after_save` is fine if all in same txn | `after_commit` is required if external system reads the DB |
| Use for **external side effects** (mail, jobs, webhooks, push, cache invalidation, search index) | ❌ Risk: side effect triggers, then transaction rolls back | ✅ — fire only if commit succeeded |

> **Rule:** any side effect that **can't be undone** belongs in `after_commit` — never `after_save`.

**Why `after_save` is dangerous for emails / jobs / webhooks:**

```ruby
class Order < ApplicationRecord
  after_save :send_confirmation_email   # ⚠️ wrong
end

ActiveRecord::Base.transaction do
  order = Order.create!(...)            # after_save fires; email sent
  raise ActiveRecord::Rollback           # transaction rolls back — email already sent!
end
```

> The user gets an email about an order that no longer exists. Use `after_commit` instead.

**Granular `after_*_commit` (preferred when applicable):**

| Form | Fires on |
|---|---|
| `after_create_commit` | Successful insert |
| `after_update_commit` | Successful update |
| `after_destroy_commit` | Successful delete |
| `after_save_commit` | Insert OR update (legacy `after_commit on: [:create, :update]`) |
| `after_commit on: [:create, :update]` | Same as `after_save_commit` (older syntax) |

**Conditional callbacks:**

```ruby
class Order < ApplicationRecord
  after_create_commit :send_confirmation, if: :paid?
  before_save :normalize_email, unless: -> { email.blank? }
  after_update :reindex_search, if: :saved_change_to_status?
end
```

**Callback chain halting:**

| In a callback... | Effect |
|---|---|
| `throw :abort` | Halts the chain; `save` returns `false` (Rails 5+) |
| `return false` (legacy) | Used to halt; **deprecated** — use `throw :abort` |
| Exception raised | Bubbles up; transaction rolls back |
| `raise ActiveRecord::Rollback` | Rolls back transaction silently |

**Common patterns:**

| Pattern | Where |
|---|---|
| Normalize / sanitize an attribute | `before_validation` |
| Set defaults from related records | `before_save` |
| Generate a slug | `before_validation` (so validation can check) |
| Audit log of changes | `after_update_commit` |
| Send email after creation | `after_create_commit` (NEVER `after_save`) |
| Enqueue a background job | `after_commit` |
| Update a counter / cache | `after_save_commit` (or use `counter_cache: true`) |
| Invalidate a Rails cache | `after_commit` |
| Reindex into Elasticsearch | `after_commit` |
| Publish a domain event | `after_commit` (or use the outbox pattern) |

**`Model#changes` / `saved_change_to_*` — what's available when:**

| Method | Available in |
|---|---|
| `changes` | Before save (pending changes) |
| `previous_changes` | After save / commit (legacy) |
| `saved_change_to_<attr>?` | After save / commit (Rails 5.1+) |
| `<attr>_was` | Before save |
| `<attr>_changed?` | Before save |
| `<attr>_was` after save | Use `saved_change_to_<attr>` instead |

> **Use `saved_change_to_*` in `after_*` callbacks** — that's the supported way after Rails 5.1.

**Touching associations:**

| Concern | Detail |
|---|---|
| `belongs_to :foo, touch: true` | Updates parent `updated_at` on save |
| Triggers parent's callbacks | Beware cascading callbacks |
| `touch: :custom_column` | Touch a different column |

**Counter caches — replacement for many callback uses:**

```ruby
class Comment < ApplicationRecord
  belongs_to :post, counter_cache: true
end
```

| Property | Detail |
|---|---|
| Maintains `posts.comments_count` automatically | No callback needed |
| Atomic via SQL `UPDATE ... SET counter = counter + 1` | Race-free |
| Add `:posts_comments_count` migration | Required |

**Concerns over callbacks:**

| Concern | Detail |
|---|---|
| Hidden side effects | Hard to read what `Order.create!` actually does |
| Hard to test | Need to load Rails + DB to trigger them |
| Tight coupling between models | Pulling on one record triggers many other systems |
| Test pollution | Callbacks fire in test fixtures; mocks complicate |
| Callback ordering | Adding a callback can change order subtly |
| Cross-model callbacks | "User changed → invalidate session → invalidate cache → ping search" — fragile chain |
| Sometimes-skipped persistence | `update_column` / `update_columns` skips callbacks; `update_attribute` partially skips; surprise paths |

**Skipping callbacks (the danger zone):**

| Method | Skips callbacks? |
|---|---|
| `save` / `save!` | Runs all |
| `update` / `update!` | Runs all |
| `update_attribute(:x, v)` | Skips validations + some callbacks |
| `update_column(:x, v)` | Skips **everything** (validation + callbacks) |
| `update_columns(x: v)` | Same — skips everything |
| `delete` | Skips destroy callbacks |
| `destroy!` | Runs destroy callbacks |
| Direct `UPDATE` SQL | Bypasses ActiveRecord entirely |

> Be very careful with `update_column(s)` — it's correct sometimes but easy to misuse.

**Service objects — when to extract:**

| Sign | Move to service |
|---|---|
| Callback contains business logic, not data shaping | ✅ |
| Callback touches multiple models | ✅ |
| Callback calls external service (HTTP, email, queue) | ✅ |
| Side effect should be testable independently | ✅ |
| Logic should be skippable in some contexts | ✅ |
| Single-line attribute normalization | ❌ — keep as callback |

**Service object pattern (the Rails idiomatic alternative):**

```ruby
class PlaceOrder
  def call(user, items)
    Order.transaction do
      order = Order.create!(user:, items:)
      Inventory.reserve!(order)
    end
    OrderConfirmedJob.perform_later(order.id)   # outside the transaction
    order
  end
end
```

> Side effects after `transaction do … end` block run only if the transaction committed — same guarantee as `after_commit`, but explicit.

**Outbox pattern — the production-grade alternative:**

```ruby
class Order < ApplicationRecord
  after_create_commit :emit_outbox

  private

  def emit_outbox
    Outbox.create!(event: 'order.created', payload: as_json)
  end
end
```

| Win | Detail |
|---|---|
| Atomic with the business write | Same transaction |
| Forwarder picks up later (CDC / poller) | Survives crashes |
| Decouples model from external systems | See [cdc_*.md](../../data_engineering/cdc_debezium_change_data_capture_wal_outbox.md) |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| `after_save` for emails / jobs | Side effect fires before commit; rollback leaves orphan effect |
| Heavy logic in callbacks | Slow saves; hard-to-debug requests |
| Callbacks calling other models that have callbacks | Cascading + infinite loops |
| `after_initialize` setting defaults | Loaded objects unexpectedly mutate |
| `after_find` doing I/O | Slow page loads |
| Callbacks tied to `current_user` (request-scoped) | Doesn't work in jobs / consoles |
| Skipping callbacks via `update_column` to "fix" a callback bug | Hides the real issue |
| Callback that triggers async job before commit | Job runs, sees stale data |

**Decision flowchart:**

| Need | Pick |
|---|---|
| Normalize an attribute (downcase, strip) | `before_validation` |
| Set a default value derived from another field | `before_save` |
| Update a counter / `updated_at` on parent | `counter_cache` / `touch:` |
| Send email / push / SMS / webhook | **`after_*_commit`** |
| Enqueue a background job | **`after_*_commit`** |
| Re-index search | **`after_*_commit`** |
| Audit log row | **`after_*_commit`** (or callback into outbox) |
| Cross-model multi-step flow | **Service object** |
| Multi-aggregate transaction | **Service object** |
| External call that must not duplicate | **Outbox + idempotency key** |

**Cross-references:**

- Outbox + CDC: [cdc_debezium_*.md](../../../data_engineering/cdc_debezium_change_data_capture_wal_outbox.md)
- Idempotency: [idempotency_*.md](../../../distributed_systems/idempotency_key_exactly_once_deduplication.md)
- Service objects + clean architecture: [clean_architecture_*.md](../../../design_patterns/architectural/clean_architecture_layers_dependency_rule.md)
- Validations: [validations_custom_validator_uniqueness.md](validations_custom_validator_uniqueness.md)

**Rule of thumb:** **`after_*_commit` for any side effect that can't be undone** (mail, jobs, webhooks, search reindex, cache invalidation). **`before_save` only for attribute normalization.** Anything more complex than "normalize this field" — extract to a **service object** or use the **outbox pattern**. **Skipping callbacks (`update_column`)** is a smell except when you genuinely need to bypass them; document why.
