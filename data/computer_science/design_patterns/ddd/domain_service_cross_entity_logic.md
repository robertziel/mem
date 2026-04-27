### Domain Service (Cross-Entity Logic)

Logic that doesn't naturally belong to any single entity or value object.

```ruby
# BAD: transfer logic forced into Account entity
class Account
  def transfer_to(other_account, amount)
    self.debit(amount)
    other_account.credit(amount)  # modifying another aggregate!
  end
end

# GOOD: domain service for cross-aggregate operation
class TransferService
  def execute(from_account, to_account, amount)
    raise InsufficientFunds if from_account.balance < amount
    from_account.debit(amount)
    to_account.credit(amount)
  end
end
```

**When to use a Domain Service:**
- Operation involves multiple aggregates
- Logic doesn't naturally belong to one entity
- The operation IS the domain concept (transferring money IS a thing)

**Domain Service vs Application Service:**
| Feature | Domain Service | Application Service |
|---------|---------------|-------------------|
| Contains | Business rules | Orchestration/coordination |
| Knows about | Domain model only | Infrastructure (DB, queues, email) |
| Example | `TransferService.execute` | `CreateOrderService.call` |
| Depends on | Entities, Value Objects | Domain Services, Repositories |

**Rule of thumb:** If logic operates on multiple aggregates, put it in a Domain Service. If it orchestrates infrastructure (DB, email, queue), it's an Application Service. Domain Services are part of the domain model — they speak the ubiquitous language.
