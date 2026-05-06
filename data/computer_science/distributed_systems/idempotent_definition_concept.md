### Idempotent — What It Means (Short)

**Definition:** an operation is **idempotent** if applying it **once or many times** produces the **same result**. Mathematically: `f(f(x)) = f(x)`. Practically: **safe to retry** without changing the outcome beyond the first call.

**One-line examples:**

| Operation | Idempotent? |
|---|---|
| `set status = "paid"` | ✅ Yes — same end state every time |
| `increment counter` | ❌ No — each call adds 1 |
| Press elevator button (already lit) | ✅ Yes |
| Charge card $100 | ❌ No — each call charges again |
| `DELETE /users/42` | ✅ Yes — gone is gone |
| `INSERT row` (no unique constraint) | ❌ No — duplicates pile up |
| `UPSERT` keyed on ID | ✅ Yes |
| Send an email | ❌ No |

**Idempotent vs Safe vs Pure (often confused):**

| Property | Means |
|---|---|
| **Idempotent** | Repeating produces the same end state |
| **Safe** | Doesn't change state at all (read-only) |
| **Pure** | No side effects + same input → same output (functional) |
| Relationship | Safe ⊂ Idempotent; Pure ⊂ Safe |

**HTTP methods quick reference:**

| Method | Idempotent? | Safe? |
|---|---|---|
| GET | ✅ | ✅ |
| HEAD | ✅ | ✅ |
| OPTIONS | ✅ | ✅ |
| PUT | ✅ | ❌ |
| DELETE | ✅ | ❌ |
| POST | ❌ | ❌ |
| PATCH | Sometimes | ❌ |

**Why it matters:**

| Need | Idempotency lets you |
|---|---|
| Retry on timeout | Resend without fear of duplicate effect |
| At-least-once delivery (queues, webhooks) | Process duplicates safely |
| Crash recovery | Re-run the work |
| Network partitions | Caller doesn't know if first call succeeded |

**How to make a non-idempotent operation idempotent:**

| Technique | Detail |
|---|---|
| **Idempotency key** | Client sends unique key; server stores `(key → result)` for N hours |
| **State-based check** | "If status already paid, skip" |
| **Unique constraint** | DB rejects duplicate inserts |
| **UPSERT** | `INSERT ... ON CONFLICT DO NOTHING/UPDATE` |
| **Conditional update** | `UPDATE ... WHERE version = ?` |
| **Dedup table** | Track processed message IDs (with TTL) |

**Cross-references:**

- Idempotency keys + dedupe deep dive: [idempotency_key_*.md](idempotency_key_exactly_once_deduplication.md)
- HTTP methods: [http_methods_*.md](../frontend/web_fundamentals/http_methods_idempotency_get_post_put_delete_idempotent.md)
- Kafka exactly-once: [exactly_once_*.md](../data_engineering/kafka/exactly_once_semantics_transactions_idempotent_producer.md)
- Webhooks: [webhook_idempotency_*.md](../api_design/webhook_idempotency_ordering_monitoring.md)
- Payments (STAN/RRN): [idempotency_stan_*.md](../design_patterns/payment_network/idempotency_stan_rrn_exactly_once_payment.md)

**Rule of thumb:** **idempotent = safe to retry**. `f(f(x)) = f(x)`. Make every distributed-system operation idempotent — at-least-once delivery is the norm, exactly-once is rare. Use **idempotency keys** for non-idempotent operations like POST and money movements.
