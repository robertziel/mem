### DDD: Ubiquitous Language

**What it is:**
- Shared vocabulary between developers AND domain experts
- Used in code, docs, conversations, diagrams — everywhere
- Same term means the same thing within a bounded context

```ruby
# Code reflects domain language, not technical jargon
class Order
  def place(customer, items)     # not "create_record"
  def fulfill(warehouse)          # not "update_status_to_3"
  def cancel(reason)              # not "set_is_active_false"
end
```

**Signs the ubiquitous language is broken:**
- Code uses different words than the business team
- Developers say "set status to 3" instead of "ship the order"
- Business documents don't match code terminology

**Rule of thumb:** If the code doesn't match how the business talks, the model is wrong. The ubiquitous language IS the codebase. Rename methods and classes to match business terminology.
