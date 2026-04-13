### E-R Model (Entity-Relationship) & Data Modeling

**E-R model components:**
- **Entity** — a real-world object (User, Order, Product)
- **Attribute** — a property of an entity (name, email, price)
- **Relationship** — association between entities (User places Order)

**Cardinality (relationship types):**
| Cardinality | Notation | Example |
|-------------|----------|---------|
| One-to-One (1:1) | User ─── Profile | One user has one profile |
| One-to-Many (1:N) | User ──< Orders | One user has many orders |
| Many-to-Many (M:N) | Students >──< Courses | Students enroll in many courses, courses have many students |

**Many-to-Many → join table:**
```sql
-- M:N requires a join table
CREATE TABLE enrollments (
  student_id BIGINT REFERENCES students(id),
  course_id BIGINT REFERENCES courses(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, course_id)
);
```

**Attribute types:**
| Type | Example |
|------|---------|
| Simple | `name`, `email` (atomic, single value) |
| Composite | `address` → street, city, zip (can be decomposed) |
| Derived | `age` (calculated from `birth_date`) |
| Multi-valued | `phone_numbers` (multiple values → separate table in relational DB) |

**ER diagram to SQL:**
```
[User] 1 ──── N [Order] N ──── M [Product]
  |                 |
  name              total
  email             status

→ Tables:
  users(id, name, email)
  orders(id, user_id FK, total, status)
  order_items(order_id FK, product_id FK, quantity, price)
  products(id, name, price)
```

**Data modeling process:**
1. Identify entities from requirements (nouns)
2. Identify attributes for each entity
3. Identify relationships and cardinality
4. Draw ER diagram
5. Normalize to 3NF
6. Denormalize selectively for performance

**Rule of thumb:** Start data modeling from business requirements (nouns → entities, verbs → relationships). M:N always needs a join table. Normalize to 3NF first, then denormalize for performance. ER diagrams are communication tools — draw them in design reviews before writing SQL.
