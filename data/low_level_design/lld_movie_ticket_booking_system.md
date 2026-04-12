### LLD: Movie Ticket Booking System

**Requirements:**
- Browse movies, theaters, shows, and available seats
- Select seats, book tickets, process payment
- Handle concurrent seat selection (two users can't book same seat)
- Different seat types (regular, premium, VIP) with different prices

**Core entities:**
- Movie, Theater, Screen, Show, Seat, Booking, Payment, User

**Class design:**
```ruby
class Movie
  attr_reader :id, :title, :duration, :genre
end

class Theater
  attr_reader :id, :name, :city, :screens
end

class Screen
  attr_reader :id, :seats  # Array of Seat
end

class Show
  attr_reader :id, :movie, :screen, :start_time, :price_map
  # price_map: { regular: 10, premium: 20, vip: 35 }

  def available_seats
    booked_ids = Booking.for_show(id).flat_map(&:seat_ids)
    screen.seats.reject { |s| booked_ids.include?(s.id) }
  end
end

class Seat
  attr_reader :id, :row, :number, :type  # :regular, :premium, :vip
end

class Booking
  attr_reader :id, :user, :show, :seats, :status, :total, :created_at
  # status: :pending, :confirmed, :cancelled, :expired

  HOLD_TIMEOUT = 10.minutes

  def self.create(user:, show:, seat_ids:)
    ActiveRecord::Base.transaction do
      # Lock seats to prevent double-booking
      seats = Seat.where(id: seat_ids).lock!
      raise "Seats unavailable" if any_booked?(show, seat_ids)

      total = seats.sum { |s| show.price_map[s.type] }

      new(
        user: user, show: show, seats: seats,
        status: :pending, total: total, created_at: Time.now
      )
    end
  end

  def confirm(payment)
    raise "Booking expired" if expired?
    self.status = :confirmed
    self.payment = payment
    save!
  end

  def expired?
    status == :pending && created_at < HOLD_TIMEOUT.ago
  end
end
```

**Seat hold and concurrency:**
```
1. User selects seats → Booking created as :pending (seats held)
2. User has 10 min to pay → Timer starts
3a. Payment succeeds → status: :confirmed
3b. Timer expires → status: :expired, seats released
3c. User cancels → status: :cancelled, seats released
```

**Preventing double-booking (critical):**
```ruby
# Option 1: Pessimistic locking (database row lock)
Seat.where(id: seat_ids).lock!  # SELECT ... FOR UPDATE

# Option 2: Optimistic locking (version column)
booking.save!  # raises StaleObjectError if version mismatch

# Option 3: Unique constraint
# UNIQUE INDEX on (show_id, seat_id) in bookings table
```

**Design patterns used:**
- **State** for booking lifecycle (Pending → Confirmed/Expired/Cancelled)
- **Strategy** for pricing (weekday, weekend, holiday pricing)
- **Observer** for notifications (booking confirmed → send email/SMS)
- **Factory** for creating different payment methods

**Search and discovery:**
```ruby
class MovieService
  def search(city:, date:, movie_id: nil)
    shows = Show.where(date: date)
                .joins(screen: :theater)
                .where(theaters: { city: city })
    shows = shows.where(movie_id: movie_id) if movie_id
    shows.includes(:movie, screen: :theater)
  end
end
```

**Extensions:**
- Coupon/discount codes
- Food/beverage add-ons
- Seat map visualization
- Waitlist for sold-out shows
- Cancellation and refund policy

**Rule of thumb:** The core challenge is concurrent seat booking. Use pessimistic locking (SELECT FOR UPDATE) for seat reservation. Use a timeout on pending bookings to release unfinished holds. State pattern for booking lifecycle.
