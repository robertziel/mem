### Query Object Pattern (Rails)

**What a Query Object is:**
- Encapsulates complex database queries in a reusable class
- Composable, testable, keeps models clean

```ruby
class ActiveUsersQuery
  def initialize(relation = User.all)
    @relation = relation
  end

  def call(since: 30.days.ago)
    @relation
      .joins(:sessions)
      .where(sessions: { created_at: since.. })
      .distinct
      .order(created_at: :desc)
  end
end

# Usage
ActiveUsersQuery.new.call(since: 7.days.ago).limit(10)
ActiveUsersQuery.new(company.users).call  # scoped to company
```

**Rule of thumb:** Extract a Query Object when a query is complex (multiple joins, subqueries), reused in multiple places, or needs to be composed with different base scopes. For simple queries, scopes on the model are fine.
