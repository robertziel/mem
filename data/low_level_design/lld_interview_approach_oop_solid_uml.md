### LLD Interview Approach: OOP, SOLID & UML

**What LLD interviews test:**
- Model real-world problems as classes and objects
- Apply OOP principles and design patterns
- Write clean, extensible, maintainable code
- Identify entities, relationships, and behaviors

**Step-by-step approach (45 min):**

**1. Gather requirements (5 min):**
- Ask clarifying questions (scope, actors, core use cases)
- List functional requirements as bullet points
- Identify constraints and edge cases

**2. Identify core entities (5 min):**
- Nouns in requirements → classes
- Verbs → methods
- Adjectives → attributes
- Example: "A user books a movie ticket for a show at a theater"
  → User, Ticket, Movie, Show, Theater, Seat, Booking

**3. Define relationships (5 min):**
- Has-a (composition): Theater HAS Screens, Screen HAS Seats
- Is-a (inheritance): CreditCardPayment IS-A Payment
- Uses (dependency): BookingService USES PaymentProcessor

**4. Design class diagram (10 min):**
```
+------------------+       +------------------+
| Theater          |       | Screen           |
|------------------|       |------------------|
| - name: String   | 1   *| - id: int        |
| - address: String|------>| - seats: Seat[]  |
| - screens: Screen[]     | - shows: Show[]  |
+------------------+       +------------------+
```

**5. Write core classes and interfaces (15 min):**
- Define interfaces for extensibility
- Apply SOLID principles
- Use appropriate design patterns

**6. Handle edge cases (5 min):**
- Concurrency (two users booking same seat)
- Error handling
- Scalability considerations

**OOP Principles quick reference:**
| Principle | Meaning | Interview signal |
|-----------|---------|-----------------|
| Encapsulation | Hide internal state, expose via methods | Private fields + public getters |
| Abstraction | Hide complexity behind interfaces | Interface/abstract class |
| Inheritance | Reuse behavior via parent class | Is-a relationship |
| Polymorphism | Same interface, different behavior | Method overriding, Strategy pattern |

**SOLID quick reference:**
| Principle | Meaning | Violation smell |
|-----------|---------|----------------|
| **S**ingle Responsibility | Class has one reason to change | God class doing everything |
| **O**pen/Closed | Open for extension, closed for modification | Changing existing code to add features |
| **L**iskov Substitution | Subtypes must be substitutable for base | Square extending Rectangle breaks |
| **I**nterface Segregation | Don't force unused methods | Interface with 20 methods |
| **D**ependency Inversion | Depend on abstractions, not concretions | Class directly instantiating dependencies |

**UML class diagram notation:**
```
+ public   - private   # protected
---->  association     --|>  inheritance
--*>   composition     -->   dependency
--o>   aggregation
```

**Rule of thumb:** Start with requirements and entities, NOT code. Draw relationships before writing classes. Apply SOLID and patterns only where they solve a real problem in the design, not for show. Interviewers care about your reasoning more than perfect syntax.
