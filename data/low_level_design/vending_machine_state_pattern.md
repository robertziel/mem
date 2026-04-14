### LLD: Vending Machine (State Pattern)

**Requirements:**
- Accept coins/bills, display products, dispense items, return change
- Multiple products with different prices and quantities
- States: idle, has money, dispensing, out of stock

**State machine:**
```
IDLE ──insert money──> HAS_MONEY
HAS_MONEY ──select product──> DISPENSING (if enough money)
HAS_MONEY ──select product──> HAS_MONEY (if not enough, show message)
HAS_MONEY ──cancel──> IDLE (return money)
DISPENSING ──dispense complete──> IDLE (return change)
```

**Class design:**
```ruby
class VendingMachine
  attr_reader :balance, :inventory

  def initialize(inventory)
    @inventory = inventory  # { product_code => { product:, quantity: } }
    @balance = 0
    @state = IdleState.new(self)
  end

  def insert_money(amount) = @state.insert_money(amount)
  def select_product(code) = @state.select_product(code)
  def cancel                = @state.cancel
  def transition_to(state)  = @state = state

  def add_balance(amount)    = @balance += amount
  def reset_balance          = (@balance = 0)
  def deduct(amount)         = @balance -= amount
end

class IdleState
  def initialize(machine) = @machine = machine

  def insert_money(amount)
    @machine.add_balance(amount)
    @machine.transition_to(HasMoneyState.new(@machine))
    "Balance: #{@machine.balance}"
  end

  def select_product(_) = "Please insert money first"
  def cancel            = "Nothing to cancel"
end

class HasMoneyState
  def initialize(machine) = @machine = machine

  def insert_money(amount)
    @machine.add_balance(amount)
    "Balance: #{@machine.balance}"
  end

  def select_product(code)
    item = @machine.inventory[code]
    return "Invalid product" unless item
    return "Out of stock" if item[:quantity] <= 0
    return "Insufficient funds (need #{item[:product].price})" if @machine.balance < item[:product].price

    @machine.transition_to(DispensingState.new(@machine, item))
  end

  def cancel
    change = @machine.balance
    @machine.reset_balance
    @machine.transition_to(IdleState.new(@machine))
    "Returned: #{change}"
  end
end

class DispensingState
  def initialize(machine, item)
    @machine = machine
    @item = item
    dispense
  end

  def insert_money(_) = "Please wait, dispensing..."
  def select_product(_) = "Please wait, dispensing..."
  def cancel = "Cannot cancel during dispensing"

  private

  def dispense
    @item[:quantity] -= 1
    change = @machine.balance - @item[:product].price
    @machine.reset_balance
    @machine.transition_to(IdleState.new(@machine))
    "Dispensed: #{@item[:product].name}. Change: #{change}"
  end
end

class Product
  attr_reader :name, :price
  def initialize(name:, price:)
    @name = name
    @price = price
  end
end
```

**Why State pattern fits:**
- Machine behavior changes entirely based on current state
- Same action (insert_money) does different things in different states
- Avoids giant if/else blocks checking state
- Adding new states is easy (extend, don't modify)

**Extensions:**
- Admin refill inventory
- Multiple payment methods (coin, bill, card)
- Product display with quantities
- Audit log of transactions
- Temperature control for cold drinks

**Rule of thumb:** Vending machine is the textbook State pattern example. Each state is a class that handles all possible actions. Transitions are explicit. This makes the code open for extension (add new states) and closed for modification (existing states unchanged).
