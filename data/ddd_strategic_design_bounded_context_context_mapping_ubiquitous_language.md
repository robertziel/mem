### DDD Strategic Design: Bounded Contexts, Context Mapping & Ubiquitous Language

**Ubiquitous Language:**
- Shared vocabulary between developers AND domain experts
- Used in code, docs, conversations, diagrams — everywhere
- Same term means the same thing within a bounded context
- Example: "Order" means different things in Sales vs Shipping vs Billing

```ruby
# Code reflects domain language, not technical jargon
class Order
  def place(customer, items)     # not "create_record"
  def fulfill(warehouse)          # not "update_status_to_3"
  def cancel(reason)              # not "set_is_active_false"
end
```

**Bounded Context:**
- Explicit boundary where a domain model applies
- Inside: terms have precise, consistent meaning
- Outside: same term may mean something different
- Each bounded context owns its data, logic, and vocabulary

```
Sales Context:
  "Product" = { name, price, description, images }
  "Customer" = { name, email, payment_methods }

Inventory Context:
  "Product" = { sku, warehouse_location, quantity_on_hand }
  "Customer" = doesn't exist here (irrelevant)

Shipping Context:
  "Order" = { tracking_number, weight, destination_address }
  "Product" = { dimensions, weight, fragile_flag }
```

**Identifying bounded contexts:**
1. Listen for language changes ("In shipping, an order means...")
2. Look for teams that own different parts of the domain
3. Find where the same word means different things
4. Look for natural consistency boundaries (what changes together)

**Context Mapping (how bounded contexts communicate):**

| Pattern | Relationship | Example |
|---------|-------------|---------|
| **Shared Kernel** | Two contexts share a small common model | Shared `Money` value object |
| **Customer-Supplier** | Upstream (supplier) provides what downstream (customer) needs | Inventory supplies data to Sales |
| **Conformist** | Downstream accepts upstream's model as-is | Integrating with external API without translation |
| **Anti-Corruption Layer (ACL)** | Downstream translates upstream model to its own | Legacy system integration |
| **Open Host Service** | Upstream provides a well-defined protocol for all consumers | Public API |
| **Published Language** | Shared exchange format (JSON schema, Protobuf) | Event contracts between services |
| **Separate Ways** | No integration (contexts are independent) | Unrelated domains |

**Anti-Corruption Layer (most commonly asked):**
```ruby
# External payment provider has a different model
# ACL translates between our domain and theirs

class PaymentGatewayAdapter
  def charge(our_payment)
    # Translate OUR model to THEIR model
    external_request = {
      amount_cents: our_payment.amount.cents,
      currency: our_payment.amount.currency,
      source: our_payment.payment_method.external_token,
      metadata: { order_id: our_payment.order_id }
    }

    result = StripeClient.create_charge(external_request)

    # Translate THEIR response back to OUR model
    PaymentResult.new(
      success: result.status == "succeeded",
      provider_id: result.id,
      error: result.failure_message
    )
  end
end
```

**Context map diagram:**
```
[Sales Context] --Customer/Supplier--> [Inventory Context]
       |                                       |
  Anti-Corruption Layer                  Open Host Service
       |                                       |
[Legacy Billing System]              [Shipping Context]
                                           |
                                      Conformist
                                           |
                                    [3rd Party Carrier API]
```

**How bounded contexts map to microservices:**
- Each bounded context = strong candidate for a microservice
- Service owns its data, API, and domain model
- Communication: events (preferred), APIs, or shared nothing
- NOT every class or module is a bounded context (too granular)

**Rule of thumb:** Start by identifying bounded contexts from the language experts use, not from the technical architecture. One team per bounded context. Use Anti-Corruption Layer when integrating with external/legacy systems. Context boundaries become service boundaries in microservices. The ubiquitous language IS the codebase — if the code doesn't match how the business talks, the model is wrong.
