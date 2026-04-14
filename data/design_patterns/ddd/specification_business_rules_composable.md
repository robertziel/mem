### Specification Pattern (Composable Business Rules)

Encapsulate a business rule into a reusable, composable object.

```ruby
class Specification
  def satisfied_by?(candidate) = raise NotImplementedError
  def and(other) = AndSpecification.new(self, other)
  def or(other) = OrSpecification.new(self, other)
  def not = NotSpecification.new(self)
end

class ActiveUserSpec < Specification
  def satisfied_by?(user) = user.active?
end

class PremiumUserSpec < Specification
  def satisfied_by?(user) = user.plan == "premium"
end

class RecentUserSpec < Specification
  def satisfied_by?(user) = user.created_at > 30.days.ago
end

# Compose specifications
eligible = ActiveUserSpec.new.and(PremiumUserSpec.new).or(RecentUserSpec.new)
users.select { |u| eligible.satisfied_by?(u) }
```

**In Rails with scopes (similar concept):**
```ruby
class User < ApplicationRecord
  scope :active, -> { where(active: true) }
  scope :premium, -> { where(plan: "premium") }
  scope :recent, -> { where("created_at > ?", 30.days.ago) }
end

User.active.premium.or(User.recent)  # composable query scopes
```

**Rule of thumb:** Specification for complex, composable business rules that need to be reused across validation, querying, and construction. In Rails, scopes serve a similar purpose for database queries. Explicit Specification pattern more common in DDD-heavy codebases.
