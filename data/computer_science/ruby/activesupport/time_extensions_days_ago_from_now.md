### ActiveSupport: Time Extensions

```ruby
# Duration objects
2.days                  # ActiveSupport::Duration
3.hours
45.minutes
1.week
6.months
1.year

# Ago / from_now
2.days.ago              # 2 days before Time.current
1.hour.from_now         # 1 hour after Time.current
3.weeks.ago
30.minutes.from_now

# Arithmetic
Time.current + 2.hours
Time.current - 1.day
Date.today + 3.months

# Time helpers
Time.current.beginning_of_day   # 00:00:00 today
Time.current.end_of_day         # 23:59:59 today
Time.current.beginning_of_week  # Monday 00:00:00
Date.today.beginning_of_month
Date.today.end_of_week
Date.today.next_occurring(:friday)

# In queries
User.where("created_at > ?", 7.days.ago)
Order.where(placed_at: 1.month.ago..Time.current)
```

**Rule of thumb:** Always use `Time.current` (respects timezone) not `Time.now`. Use `2.days.ago` over `Time.current - 172800`. Duration objects make date arithmetic readable and correct across DST transitions.
