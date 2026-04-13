### Anti-Corruption Layer (Integration Boundary)

Translate between your domain model and an external/legacy system at the boundary.

```ruby
# External payment API has a different model than ours
class PaymentGatewayAdapter  # Anti-Corruption Layer
  def charge(our_payment)
    # Translate OUR model → THEIR format
    external_request = {
      amount_cents: our_payment.amount.cents,
      currency: our_payment.amount.currency,
      source: our_payment.method.external_token,
      metadata: { order_id: our_payment.order_id }
    }

    result = StripeClient.create_charge(external_request)

    # Translate THEIR response → OUR model
    PaymentResult.new(
      success: result.status == "succeeded",
      provider_id: result.id,
      error: result.failure_message
    )
  end
end

# Our domain code never touches Stripe's model directly
result = PaymentGatewayAdapter.new.charge(payment)
```

**When to use:**
- Integrating with third-party APIs (Stripe, Twilio, SendGrid)
- Wrapping legacy systems with different terminology
- Isolating your domain from external model changes
- Multiple providers for same service (swap Stripe for Adyen)

**Rule of thumb:** Never let external models leak into your domain. Translate at the boundary. If the external API changes, only the ACL changes — your domain code stays clean. One adapter per external system.
