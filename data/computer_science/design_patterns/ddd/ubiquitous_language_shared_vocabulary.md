### DDD — Ubiquitous Language (Shared Vocabulary)

**Definition:** the **vocabulary used inside a Bounded Context** — by developers, domain experts, product, support, design, and the code itself. Same term means the same thing **everywhere**: code, conversations, docs, diagrams, tickets, emails.

**Why it matters:**

| Win | Detail |
|---|---|
| Code mirrors domain | Reading the codebase teaches the business |
| No translation tax | Engineers + domain experts say the same thing |
| Refactor moves with language | Renaming reveals model gaps |
| Documentation stays accurate | Code IS the documentation |
| Onboarding accelerated | New people learn business + code together |
| Bugs reveal model errors | "We thought 'shipped' included 'in transit' — it doesn't" |

**The relationship to bounded context:**

| Concept | Detail |
|---|---|
| **Bounded context** | The boundary in which a model applies |
| **Ubiquitous language** | The vocabulary used inside that boundary |
| Per-context | Different bounded contexts have **different** ubiquitous languages |
| Translations at the seam | Anti-corruption layer maps between context vocabularies |

> Same word can mean different things in different contexts — that's a feature of bounded contexts, not a bug.

**What "ubiquitous" means in practice:**

| Where the language must show up | Examples |
|---|---|
| **Class / module names** | `Order`, `Invoice`, `Refund` (not `OrderManager`, `OrderService` everywhere) |
| **Method names** | `place_order(customer, items)`, not `create_record` |
| **Database tables / columns** | `orders`, `customer_id` (not `tbl_ord` or `cust_id`) |
| **API endpoints** | `POST /orders`, not `POST /create-data` |
| **Event names** | `OrderPlaced`, not `RecordSaved` |
| **Test descriptions** | `it "rejects an order placed below the minimum"` |
| **Variable names** | `cancellation_reason`, not `flag_2` |
| **Tickets / commits / PR titles** | "Fix bug where order is double-charged on partial fulfillment" |
| **Support communications** | Same vocabulary the engineering team uses |
| **Diagrams** | Same boxes / verbs / events |

**Code examples — bad → good:**

```ruby
# Bad — generic, technical, business-language stripped
class OrderRecord
  def create_with_data(payload)
    self.status = 3       # status enum
    self.flag_x = true
    save
  end
  def update_status_to_4
    update(status: 4)
  end
end

# Good — every name is business language
class Order
  def place(customer:, items:)
    self.placed_by = customer
    self.line_items = items
    self.status = :placed
    save
  end

  def fulfill(by:)
    self.fulfilled_at = Time.current
    self.fulfilled_by = by
    self.status = :fulfilled
    save
  end

  def cancel(reason:)
    self.cancelled_at = Time.current
    self.cancellation_reason = reason
    self.status = :cancelled
    save
  end
end
```

**Signs the ubiquitous language is broken:**

| Smell | Translation |
|---|---|
| Code uses different words than the business team | "Set status to 3" instead of "ship the order" |
| Different teams use different words for the same thing | Sales says "client", Support says "customer", code says `account_id` |
| Class names like `Manager`, `Helper`, `Service`, `Util` everywhere | Lacks domain meaning |
| Comments explain what business concept the code represents | The code itself should say it |
| Database column names that map mysteriously | `flag_a`, `f1`, `dt` |
| Status enums (`status: 3`) without symbolic names | Tribal knowledge required |
| Domain experts can't read the code | The language failed |
| Bug reports translate from business → technical → business | Translation tax |

**Building the ubiquitous language:**

| Activity | Detail |
|---|---|
| **EventStorming** | Workshop where business + engineering map domain events together; vocabulary emerges |
| **Glossary in the repo** | Living glossary of domain terms; updated with PRs |
| **Domain-expert reviews of code** | Domain experts read PRs / class names |
| **Pair / mob across roles** | Engineer + product + support work together |
| **Renaming during refactors** | When the language drifts, rename rather than comment |
| **Examples / acceptance tests in business language** | "When a Gold member places an order over $100, free shipping applies" |

**Glossary structure example:**

| Term | Definition | Used in |
|---|---|---|
| **Order** | A customer's request to purchase one or more items. State machine: placed → paid → fulfilled → shipped → delivered (or cancelled / refunded). | Sales, Fulfillment, Support |
| **Cart** | An in-progress collection of items before an order is placed. Cleared on Order placement or after 7 days of inactivity. | Sales |
| **Fulfillment** | The act of preparing a placed order for shipment from a warehouse. | Operations |
| **Shipment** | The physical package moving through a carrier; one Order can have multiple Shipments (split shipments). | Logistics |
| **Refund** | Reversal of a captured payment, full or partial; can be triggered by Cancel before fulfillment or Return after delivery. | Sales, Finance, Support |
| **Backorder** | Order accepted with items not currently in stock; fulfilled when stock arrives. | Inventory, Sales |

**Naming heuristics:**

| Heuristic | Detail |
|---|---|
| Verbs for actions | `place`, `cancel`, `ship`, `refund`, `dispute` |
| Nouns for entities | `Order`, `Customer`, `Invoice`, `Shipment` |
| Past-tense events | `OrderPlaced`, `PaymentReceived`, `OrderShipped` |
| Boolean predicates with `?` | `paid?`, `cancellable?`, `shipped?` |
| Avoid generic suffixes | `Manager`, `Helper`, `Util`, `Handler` (often signal missing concept) |
| Avoid `Service` everywhere | OK as a deliberate naming pattern; not a default |
| Avoid abbreviations | `customer_id` over `cust_id`, `quantity` over `qty` |
| Avoid status enums by integer | Use symbols / strings: `:placed`, `:paid` |

**Renaming as a code-smell tool:**

| When you can't rename cleanly | Indicates |
|---|---|
| "It's used in too many places" | Concept needs a clearer name everywhere — invest the refactor |
| "The new name doesn't quite fit" | The current model isn't matching the domain |
| "We use this name to mean two different things" | Bounded contexts have collided — separate them |
| "Nobody knows what to call it" | Workshop with domain experts |

**Domain experts as the language source:**

| Practice | Detail |
|---|---|
| Listen to how product / support / sales describe things | That's the language |
| Ask follow-up questions to disambiguate | "When you say 'order', do you mean before or after payment?" |
| Write the glossary together | Sign-off from domain experts |
| Code reviews include "does this name match how the business talks?" | Reviewer checklist |

**When language collides with technical reality:**

| Conflict | Resolution |
|---|---|
| Domain says "Order"; ORM has `Order` reserved word | Use `OrdersController`, `Order` model — escape technically as needed |
| Database needs underscores; domain language is "shopping cart" | `shopping_carts` table, `ShoppingCart` model |
| External vendor uses different vocabulary | Translate at the **anti-corruption layer**; don't pollute internal language |

**Anti-corruption layer (ACL) protects the language:**

```
    ┌─────────────────┐                 ┌─────────────────┐
    │  Stripe vocab   │  ← (vendor) →   │   Your vocab    │
    │  Charge         │                 │   Payment       │
    │  Customer       │                 │   Buyer         │
    │  PaymentIntent  │                 │   PaymentAttempt│
    └────────┬────────┘                 └────────▲────────┘
             │       Anti-Corruption Layer       │
             └─────────── translates ────────────┘
```

> The ACL maps Stripe's terminology to your domain's. Your code never says "PaymentIntent" — it says "PaymentAttempt". One vendor swap doesn't ripple through the codebase.

**Anti-patterns:**

| Anti-pattern | Effect |
|---|---|
| **Generic names** (`Manager`, `Util`, `Helper`) | Strips business meaning |
| **`*Service`** for everything | Stops being meaningful when overused |
| **Status integers** (`status: 3`) | Tribal knowledge required |
| **Vendor-leakage** (using Stripe's `Charge` everywhere) | Couples codebase to vendor |
| **Translating names per layer** | Confusion at every boundary |
| **Different names in code, docs, support tickets** | Translation tax |
| **Naming after the database column type** | `text_field_2`, `flag_a` |
| **Cargo-cult DDD names** | `OrderAggregateRoot`, `OrderRepository` everywhere — only when they're actually aggregates / repos |

**Process for changing the language:**

| Step | Detail |
|---|---|
| 1 | Notice the gap — code says X, business says Y |
| 2 | Confirm with domain experts |
| 3 | Update the glossary first |
| 4 | Refactor code (IDE rename) |
| 5 | Update tests, docs, communications |
| 6 | Migrate database columns / API fields with deprecation if external |

**Cross-references:**

- Bounded context (where ubiquitous language lives): [bounded_context_*.md](bounded_context_linguistic_boundary.md)
- Clean architecture (separation of concerns): [clean_architecture_*.md](../architectural/clean_architecture_layers_dependency_rule.md)
- API resource modeling (use ubiquitous language in URLs): [resource_modeling_*.md](../../api_design/resource_modeling_collections_subresources_relationships_nouns.md)
- API naming consistency: [naming_consistency_*.md](../../api_design/naming_consistency_endpoints_fields_enums_conventions.md)

**Rule of thumb:** **if the code doesn't match how the business talks, the model is wrong.** The ubiquitous language **IS** the codebase — class names, methods, columns, events, tickets, all the way down. **Build a glossary**, write business-language tests, and refactor names mercilessly when the language drifts. **Translate at the ACL** when integrating with vendors so their vocabulary never leaks into your domain.
