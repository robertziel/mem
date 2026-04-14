### DDD: Context Mapping & Anti-Corruption Layer

**Context mapping patterns:**
| Pattern | Relationship | Example |
|---------|-------------|---------|
| **Shared Kernel** | Two contexts share a small common model | Shared `Money` value object |
| **Customer-Supplier** | Upstream provides what downstream needs | Inventory supplies Sales |
| **Conformist** | Downstream accepts upstream's model as-is | Integrating external API |
| **Anti-Corruption Layer** | Downstream translates upstream's model | Legacy system integration |
| **Open Host Service** | Upstream provides a well-defined protocol | Public API |
| **Separate Ways** | No integration needed | Unrelated domains |

**Anti-Corruption Layer (ACL):**
```ruby
class PaymentGatewayAdapter
  def charge(our_payment)
    # Translate OUR model to THEIR model
    external_request = {
      amount_cents: our_payment.amount.cents,
      source: our_payment.payment_method.external_token
    }
    result = StripeClient.create_charge(external_request)

    # Translate THEIR response to OUR model
    PaymentResult.new(
      success: result.status == "succeeded",
      provider_id: result.id
    )
  end
end
```

**Rule of thumb:** Anti-Corruption Layer when integrating with external/legacy systems. Translate at the boundary — never let external models leak into your domain. The ACL is where "their language" meets "your language."
