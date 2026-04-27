### Database Normalization (1NF → BCNF)

**Why normalize:**
- Eliminate data redundancy (same data stored in multiple places)
- Prevent update anomalies (change in one place, stale in another)
- Ensure data integrity

**1NF (First Normal Form):**
- Each column holds atomic (single) values — no lists, no arrays
- Each row is unique (has a primary key)
```
❌ Violates 1NF:
| user_id | phones              |
| 1       | 555-0100, 555-0200  |  ← multiple values in one column

✅ 1NF:
| user_id | phone    |
| 1       | 555-0100 |
| 1       | 555-0200 |
```

**2NF (Second Normal Form):**
- Must be in 1NF
- Every non-key column depends on the ENTIRE primary key (not just part of it)
- Only relevant for composite primary keys
```
❌ Violates 2NF (composite key: student_id + course_id):
| student_id | course_id | student_name | grade |
student_name depends only on student_id, not on (student_id, course_id)

✅ 2NF: split into two tables
Students: | student_id | student_name |
Grades:   | student_id | course_id | grade |
```

**3NF (Third Normal Form):**
- Must be in 2NF
- No transitive dependencies (non-key column depending on another non-key column)
```
❌ Violates 3NF:
| employee_id | department_id | department_name |
department_name depends on department_id, not on employee_id

✅ 3NF: split
Employees:   | employee_id | department_id |
Departments: | department_id | department_name |
```

**BCNF (Boyce-Codd Normal Form):**
- Must be in 3NF
- Every determinant is a candidate key
- Rarely discussed beyond 3NF in interviews

**When to denormalize:**
| Scenario | Normalize | Denormalize |
|----------|-----------|-------------|
| OLTP (transactional app) | ✅ Default | Only for hot queries |
| OLAP (analytics/warehouse) | Rarely | ✅ Star schema |
| Read-heavy, few writes | Sometimes | ✅ Precompute joins |
| Write-heavy | ✅ Less redundancy | Avoid |

**Rule of thumb:** Normalize to 3NF for transactional applications. Denormalize selectively for read performance (add redundant columns, materialized views). Data warehouses use star/snowflake schema (intentionally denormalized). Normalize for correctness first, denormalize for performance second.
