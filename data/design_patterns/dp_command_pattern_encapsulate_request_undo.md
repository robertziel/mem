### Command Pattern (Encapsulate Request as Object)

Encapsulate operations for: undo, queue, log, and parameterize.

```ruby
class TransferMoneyCommand
  def initialize(from_account, to_account, amount)
    @from = from_account
    @to = to_account
    @amount = amount
  end

  def execute
    @from.debit(@amount)
    @to.credit(@amount)
  end

  def undo
    @to.debit(@amount)
    @from.credit(@amount)
  end
end

cmd = TransferMoneyCommand.new(account_a, account_b, 100)
cmd.execute
cmd.undo  # reversible
```

**Rule of thumb:** Command when you need undo/redo, queuing operations, or transaction logging. Each command is a self-contained operation object. Background jobs (Sidekiq) are essentially the command pattern.
