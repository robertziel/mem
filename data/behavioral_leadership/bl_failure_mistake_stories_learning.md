### Failure & Mistake Stories

**Why this is asked:**
- Tests self-awareness, accountability, and growth mindset
- Every company asks some variant: "Tell me about your biggest failure"
- Interviewers want honesty, not perfection

**Common question variants:**
- "Tell me about a time you failed."
- "Describe your biggest professional mistake."
- "Tell me about a time something went wrong in production."
- "When did you miss a deadline? What happened?"
- "Describe a decision you'd make differently in hindsight."

**What the interviewer evaluates:**
| Signal | Good | Bad |
|--------|------|-----|
| Accountability | "I made the wrong call" | "It wasn't my fault" |
| Self-awareness | Genuine reflection | Humble-brag disguised as failure |
| Impact awareness | Understands the consequences | Minimizes the impact |
| Learning | Concrete behavior change after | Vague "I learned a lot" |
| Prevention | Put systems in place to prevent recurrence | Same mistake could happen again |

**Story structure (modified STAR):**
```
S: What was the situation?
T: What was your role/responsibility?
A: What went WRONG and why? (own it fully)
I: What was the IMPACT? (don't minimize)
L: What did you LEARN? (be specific)
C: What did you CHANGE? (systems, processes, habits)
```

**Example: Production incident**
```
S: "At [company], I was leading the migration of our payment
   service to a new database."
T: "I was responsible for the migration plan and execution."
A: "I underestimated the data volume and didn't run a full
   rehearsal with production-sized data. During the migration,
   the process took 3x longer than planned, and we exceeded
   our maintenance window."
I: "Payments were down for 2 hours beyond the scheduled window,
   affecting approximately $50K in transactions."
L: "I learned three things: always rehearse with production-scale
   data, have a rollback plan with a clear trigger point, and
   communicate proactively with stakeholders."
C: "I created a migration checklist that became our team standard.
   We now require a dress rehearsal and a documented rollback
   plan for any data migration. Our next three migrations were
   zero-downtime."
```

**Choosing the right failure story:**
- Real enough to be credible (not a humble-brag)
- Not so catastrophic it raises red flags (don't say "I deleted the production database")
- Shows growth: the "after" is clearly better than the "before"
- Ideally shows systemic improvement (not just personal learning)

**Failures that work well:**
- Underestimated complexity / missed deadline
- Skipped testing, caused a bug in production
- Built the wrong thing (didn't validate requirements)
- Didn't communicate proactively, surprised stakeholders
- Over-engineered a solution when simple would have worked

**Rule of thumb:** Pick a real failure, own it completely (no blame-shifting), show the impact honestly, and spend 50% of your answer on what you learned and changed. The best answers show you built systems to prevent recurrence, not just personal awareness.
