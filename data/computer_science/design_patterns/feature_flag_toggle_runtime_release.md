### Feature Flag / Toggle Pattern

Enable or disable features at runtime without deploying new code.

```ruby
# Simple feature flag (env var)
if ENV["ENABLE_NEW_CHECKOUT"] == "true"
  render_new_checkout
else
  render_old_checkout
end

# Database-backed (Flipper gem)
gem 'flipper'
gem 'flipper-active_record'

# Enable for everyone
Flipper.enable(:new_checkout)

# Enable for percentage
Flipper.enable_percentage_of_actors(:new_checkout, 10)  # 10% of users

# Enable for specific users
Flipper.enable_actor(:new_checkout, current_user)

# Check in code
if Flipper.enabled?(:new_checkout, current_user)
  render_new_checkout
else
  render_old_checkout
end
```

**Flag types:**
| Type | Lifetime | Example |
|------|----------|---------|
| Release flag | Days-weeks | Roll out new feature gradually |
| Experiment flag | Weeks | A/B test |
| Ops flag | Permanent | Kill switch for degraded mode |
| Permission flag | Permanent | Premium features |

**Best practices:**
- Remove release flags after full rollout (they're tech debt)
- Name flags descriptively: `enable_new_checkout`, not `flag_123`
- Log flag evaluations for debugging
- Default to OFF for new flags (safe)
- Clean up old flags regularly

**Tools:** Flipper (Ruby), LaunchDarkly (SaaS), Unleash (open-source), env vars (simplest).

**Rule of thumb:** Feature flags decouple deployment from release. Deploy code daily, enable features when ready. Use Flipper gem for Rails. Remove release flags after full rollout. Keep kill switches for operational emergencies.
