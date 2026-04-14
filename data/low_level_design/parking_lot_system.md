### LLD: Parking Lot System

**Requirements:**
- Multiple floors, each with parking spots of different sizes
- Vehicle types: motorcycle, car, truck (different spot sizes)
- Issue ticket on entry, calculate fee on exit
- Track available spots per floor and type

**Core entities:**
- ParkingLot, Floor, ParkingSpot, Vehicle, Ticket, Payment

**Class design:**
```ruby
class ParkingLot
  attr_reader :floors

  def initialize(floors)
    @floors = floors
  end

  def park(vehicle)
    spot = find_available_spot(vehicle.type)
    raise "No spot available" unless spot
    spot.assign(vehicle)
    Ticket.new(vehicle: vehicle, spot: spot, entry_time: Time.now)
  end

  def unpark(ticket)
    fee = calculate_fee(ticket)
    ticket.spot.release
    Payment.new(amount: fee, ticket: ticket)
  end

  private

  def find_available_spot(vehicle_type)
    @floors.each do |floor|
      spot = floor.find_spot(vehicle_type)
      return spot if spot
    end
    nil
  end

  def calculate_fee(ticket)
    hours = ((Time.now - ticket.entry_time) / 3600.0).ceil
    ticket.spot.rate_per_hour * hours
  end
end

class Floor
  attr_reader :spots

  def find_spot(vehicle_type)
    size = SpotSize.for(vehicle_type)
    @spots.find { |s| s.available? && s.size >= size }
  end
end

class ParkingSpot
  attr_reader :size, :rate_per_hour
  attr_accessor :vehicle

  def available? = @vehicle.nil?
  def assign(vehicle) = @vehicle = vehicle
  def release = @vehicle = nil
end

class Vehicle
  attr_reader :license_plate, :type  # :motorcycle, :car, :truck
end

class Ticket
  attr_reader :vehicle, :spot, :entry_time
end
```

**Design patterns used:**
- **Strategy** for fee calculation (hourly, flat rate, tiered)
- **Factory** for creating appropriate spot assignments
- **Observer** for updating display boards when spots change

**Concurrency consideration:**
- Two vehicles can't get the same spot
- Use mutex/lock on spot assignment or optimistic locking
```ruby
def park(vehicle)
  @mutex.synchronize do
    spot = find_available_spot(vehicle.type)
    raise "No spot available" unless spot
    spot.assign(vehicle)
    Ticket.new(vehicle: vehicle, spot: spot, entry_time: Time.now)
  end
end
```

**Extensions to discuss:**
- Multiple entry/exit points
- Electric vehicle charging spots
- Handicapped spots (priority)
- Monthly subscription vs hourly rate
- Display board showing available spots per floor

**Rule of thumb:** Start with the core flow (park → ticket → unpark → payment). Model spot sizes as a hierarchy or enum. Use Strategy pattern for flexible fee calculation. Address concurrency for spot assignment.
