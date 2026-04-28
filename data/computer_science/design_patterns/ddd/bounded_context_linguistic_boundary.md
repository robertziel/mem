### DDD — Bounded Context (Linguistic Boundary)

**Definition:** an explicit boundary inside which a particular domain model — and its **language** — applies. Inside the boundary, terms have one precise meaning. Outside the boundary, the same word may mean something completely different.

**Why it matters:** large domains have **multiple legitimate meanings** for the same word. Forcing one big model crashes against this reality. Bounded contexts make the boundaries (and translations) explicit.

**Concrete example — "Product" means different things in different contexts:**

| Context | What "Product" includes |
|---|---|
| **Sales** | name, price, description, images, marketing copy |
| **Inventory** | SKU, warehouse location, quantity on hand, reorder threshold |
| **Shipping** | weight, dimensions, fragility class |
| **Catalog** | category hierarchy, search keywords, faceted attributes |
| **Manufacturing** | bill of materials, lead time, supplier |
| **Customer Support** | warranty terms, return policy, known issues |
| **Tax / Compliance** | HS code, taxability per region, restricted countries |

> Same noun, different objects. **Forcing one shared `Product` class** would either bloat into "everything for everyone" (cohesion gone) or constantly break under conflicting requirements.

**Bounded context vs other DDD concepts:**

| Concept | Detail |
|---|---|
| **Ubiquitous Language** | Vocabulary used inside one bounded context |
| **Bounded Context** | The scope where that language applies |
| **Domain** | The whole problem area (e.g. "e-commerce") |
| **Subdomain** | Slice of the domain (Core / Supporting / Generic) |
| **Aggregate** | Consistency boundary inside a context |
| **Context Map** | Diagram of relationships between contexts |

> **Rule:** ubiquitous language is **per bounded context**, not per company. "Order" in Sales ≠ "Order" in Shipping.

**How to identify bounded contexts:**

| Signal | Detail |
|---|---|
| **Language shift** | "In sales, an order means... but in shipping..." |
| **Different teams own different parts** | Conway's Law — boundaries follow team structure |
| **Data ownership splits** | Inventory team writes, Sales team reads via API |
| **Same word, different meaning** | Strong signal of a boundary |
| **Different lifecycles** | Order created in Sales, shipped in Logistics, refunded in Support |
| **Different consistency requirements** | Inventory needs strong consistency; analytics doesn't |
| **Different change cadences** | Pricing changes daily; product catalog monthly |
| **Different external integrations** | Payment provider, shipping carrier, etc. |

**Subdomain types — strategic classification:**

| Type | Detail | Investment |
|---|---|---|
| **Core** | Where the business differentiates | Build in-house; invest heavily |
| **Supporting** | Necessary but not differentiating | Build in-house, simpler |
| **Generic** | Solved problems (auth, billing, identity) | Buy / use COTS / SaaS |

> **Don't waste senior engineers on Generic subdomains.** Auth = Auth0 / Clerk; payments = Stripe; email = SES + a templating gem.

**Context map — the relationship types:**

| Pattern | Detail |
|---|---|
| **Shared Kernel** | Two contexts share a small subset of code/model — coordinate carefully |
| **Customer / Supplier** | One downstream depends on another upstream; communicate priorities |
| **Conformist** | Downstream conforms to upstream's model (no influence) |
| **Anti-Corruption Layer (ACL)** | Translation layer that protects your domain from a messy/legacy upstream |
| **Open Host Service** | Upstream publishes a clean public API for many consumers |
| **Published Language** | Stable shared schema (events / DTOs / API spec) |
| **Separate Ways** | Two contexts have nothing to do with each other |
| **Big Ball of Mud** | What you're trying to avoid |

**Anti-Corruption Layer (ACL) — when it pays:**

| Need | Detail |
|---|---|
| Integrating with a legacy / messy external system | Don't let their model leak into yours |
| Migrating away from an old service | ACL hides the destination switch |
| Multiple upstream sources representing same concept differently | Normalize at the boundary |
| Vocabulary mismatch | Translate names + shapes |

**One bounded context ≈ one microservice (when going service-oriented):**

| Property | Detail |
|---|---|
| Each microservice owns its data | No shared DB across contexts |
| Each speaks its own ubiquitous language internally | API expressions translate at boundaries |
| Inter-service communication via published language | Stable contracts |
| Deployment independence | Per-context teams ship on their own cadence |

> Microservices fail when **service boundaries don't align with bounded contexts** — you end up with chatty cross-service calls or shared models bleeding through.

**Conway's Law connection:**

| Pattern | Detail |
|---|---|
| Conway's Law | "Software architecture follows organization structure" |
| Inverse Conway Maneuver | Organize teams to match the desired architecture |
| One team owns one bounded context | Aligns ownership + cohesion |
| Cross-context concerns require cross-team coordination | Bounded contexts surface this honestly |

**Practical workflow — finding your contexts:**

| Step | Detail |
|---|---|
| 1 | **EventStorming** workshop with domain experts + engineers |
| 2 | List every domain event (`OrderPlaced`, `PaymentCaptured`, ...) |
| 3 | Group events by language clusters (where do same nouns mean same things?) |
| 4 | Mark boundaries where language shifts |
| 5 | Each cluster = candidate bounded context |
| 6 | Draw the **context map** with relationship types |
| 7 | Identify Core vs Supporting vs Generic subdomains |
| 8 | Plan ACLs / shared kernels / published languages where contexts meet |

**EventStorming legend (typical sticky-note colors):**

| Color | Meaning |
|---|---|
| Orange | Domain event (past tense) |
| Blue | Command (imperative) |
| Yellow | Aggregate (consistency boundary) |
| Pink | External system / actor |
| Purple | Policy / business rule |
| Red | Hot spot / question |

**Example bounded contexts in an e-commerce domain:**

| Context | What lives here |
|---|---|
| **Catalog** | Products, categories, search |
| **Pricing** | Price lists, discounts, promotions |
| **Inventory** | Stock levels, warehouse |
| **Order Management** | Cart → order lifecycle |
| **Payments** | Authorize, capture, refund |
| **Shipping** | Carriers, labels, tracking |
| **Returns / Reverse Logistics** | RMA, refunds |
| **Customer / Identity** | Accounts, auth |
| **Customer Support** | Tickets, communications |
| **Recommendations** | ML candidate generation + ranking |
| **Analytics / BI** | Warehouse, reporting |
| **Tax / Compliance** | Per-region rules |

> Each is a candidate microservice. Each has its own language, its own data, its own team.

**Translation between contexts — the published language:**

| Concept | Detail |
|---|---|
| Common form: domain events | `OrderPlaced { order_id, customer_id, line_items[], total_cents }` |
| Stable schema (Avro / Protobuf / JSON Schema) | Versioned in a registry |
| Each consumer maps event → its own model | ACL inside each consumer |
| Backward + forward compatibility rules | Add fields, never remove; tolerant readers |

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| One canonical "shared model" used everywhere | Loses context-specific meaning |
| Microservices that share a DB | Bounded context violated; unintended coupling |
| Letting language drift inside one context | Loses ubiquitous language benefit |
| Premature splitting | Many tiny contexts before the language is clear |
| Refusing to split when language clearly diverges | Big ball of mud |
| Treating subdomains as equally valuable | Investing senior eng in Generic problems |
| ACL omitted at noisy boundary | External system's mess pollutes your domain |
| Naming a context after a team | Reorgs invalidate the model |
| Naming after a technology (`mongo-service`) | Doesn't reflect domain |

**When *not* to use bounded contexts (or DDD generally):**

| Situation | Why |
|---|---|
| Tiny / simple CRUD app | Overkill |
| Domain not yet understood | Premature; explore first |
| Generic subdomains | Buy / use COTS, don't model |
| Throwaway prototypes | Optimize for learning, not architecture |

**Cross-references:**

- Clean architecture (layers within a bounded context): [clean_architecture_*.md](../architectural/clean_architecture_layers_dependency_rule.md)
- DTOs (carry data across boundaries): [dto_*.md](../dto_data_transfer_object_serialization.md)
- API versioning (when contexts publish to each other): [api_versioning_*.md](../../microservices/api_versioning_backward_compatibility_evolution.md)
- Microservices design: search `microservices/`
- Multi-tenant SaaS (orthogonal but related): [multi_tenant_*.md](../../system_design_hld_high_level_design/case_studies/multi_tenant_saas_tenant_id_schemas.md)

**Rule of thumb:** **bounded contexts are linguistic boundaries.** Same word, different meaning = different context. **One team per context** is the practical Conway's Law translation. **Each bounded context becomes a candidate microservice** — and microservices fail when their boundaries don't align with bounded contexts. Use **EventStorming** to find them; use **published languages + ACLs** at the seams.
