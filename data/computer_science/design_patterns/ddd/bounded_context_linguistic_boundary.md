### DDD: Bounded Context

**What a Bounded Context is:**
- Explicit boundary where a domain model applies
- Inside: terms have precise, consistent meaning
- Outside: same term may mean something different

```
Sales Context:
  "Product" = { name, price, description, images }
  "Customer" = { name, email, payment_methods }

Inventory Context:
  "Product" = { sku, warehouse_location, quantity_on_hand }
  "Customer" = doesn't exist here

Shipping Context:
  "Order" = { tracking_number, weight, destination }
```

**How to identify bounded contexts:**
1. Listen for language changes ("In shipping, an order means...")
2. Look for teams that own different parts of the domain
3. Find where the same word means different things
4. Look for natural consistency boundaries

**Each bounded context → candidate microservice.**

**Rule of thumb:** Bounded contexts are linguistic boundaries. Same word, different meaning = different context. One team per bounded context. Context boundaries become service boundaries.
