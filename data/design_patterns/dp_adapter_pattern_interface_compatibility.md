### Adapter Pattern (Interface Compatibility)

Convert one interface into another that clients expect.

```ruby
class StripeAdapter
  def initialize(stripe_client)
    @client = stripe_client
  end

  def charge(amount_cents, token)
    @client.create_charge(amount: amount_cents, source: token, currency: 'usd')
  end
end

# Now both adapters share the same interface
payment = StripeAdapter.new(Stripe::Client.new)
payment.charge(1000, token)
```

**Rule of thumb:** Adapter when integrating third-party libraries or legacy code with a different interface. Wrap the external code behind YOUR interface so you can swap implementations.
