### LLD: Elevator System

**Requirements:**
- Multiple elevators in a building with N floors
- Handle up/down requests from floors and floor requests from inside
- Optimize: minimize wait time, minimize travel distance
- Handle: idle, moving, door open/close states

**Core entities:**
- Building, Elevator, Request, ElevatorController, Door, Display

**State machine for elevator:**
```
IDLE ──request──> MOVING_UP/MOVING_DOWN
                      |
               reached floor with request
                      |
                  DOOR_OPEN ──timeout──> IDLE (if no pending requests)
                             ──timeout──> MOVING (if pending requests)
```

**Scheduling algorithms:**
| Algorithm | How | Tradeoff |
|-----------|-----|----------|
| FCFS | First come first served | Simple, but inefficient |
| SSTF (Shortest Seek) | Go to nearest requested floor | Low wait, but starvation possible |
| SCAN (Elevator) | Go one direction, reverse at end | Fair, like a real elevator |
| LOOK | Like SCAN but reverse at last request | Efficient, most common |

**Class design:**
```ruby
class ElevatorController
  def initialize(elevators)
    @elevators = elevators
  end

  def request(floor, direction)
    elevator = select_best_elevator(floor, direction)
    elevator.add_request(floor)
  end

  private

  def select_best_elevator(floor, direction)
    @elevators
      .select { |e| can_serve?(e, floor, direction) }
      .min_by { |e| (e.current_floor - floor).abs }
  end

  def can_serve?(elevator, floor, direction)
    return true if elevator.idle?
    return true if elevator.direction == direction &&
                   elevator.moving_toward?(floor)
    false
  end
end

class Elevator
  attr_reader :current_floor, :direction, :state

  def initialize(id)
    @id = id
    @current_floor = 0
    @state = :idle       # :idle, :moving, :door_open
    @direction = :none   # :up, :down, :none
    @requests = SortedSet.new
  end

  def add_request(floor)
    @requests.add(floor)
    process_next if idle?
  end

  def idle? = @state == :idle
  def moving_toward?(floor)
    (@direction == :up && floor >= @current_floor) ||
    (@direction == :down && floor <= @current_floor)
  end

  private

  def process_next
    return if @requests.empty?
    next_floor = find_next_floor
    move_to(next_floor)
  end

  def find_next_floor  # LOOK algorithm
    if @direction == :up || @direction == :none
      @requests.find { |f| f >= @current_floor } || @requests.last
    else
      @requests.reverse_each.find { |f| f <= @current_floor } || @requests.first
    end
  end
end
```

**Design patterns used:**
- **State** for elevator states (Idle, MovingUp, MovingDown, DoorOpen)
- **Strategy** for scheduling algorithm (swap FCFS, SCAN, LOOK)
- **Observer** for display updates and floor indicators
- **Command** for request objects (floor + direction)

**Extensions to discuss:**
- VIP/express elevator (skips floors)
- Weight capacity limits
- Emergency mode (go to ground floor)
- Maintenance mode (take elevator offline)
- Energy optimization (park idle elevators at different default floors)

**Rule of thumb:** Model the elevator as a state machine. Use Strategy pattern for the scheduling algorithm. The controller picks the best elevator for each request. LOOK/SCAN algorithm is the expected answer for scheduling.
