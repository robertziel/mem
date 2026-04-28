### Data Quality (Great Expectations, Pandera, schema validation, profiling, dimensions)

**When:** any production data pipeline / ML system. Untested data → broken models / wrong dashboards / silent corruption. Data quality is **the QA discipline for analytics** — same role unit tests play for code.

**Schema (the six dimensions):**

| Dimension | Question |
|---|---|
| **Completeness** | Are all required values present? (Missing %, null counts) |
| **Accuracy** | Do values reflect reality? (Cross-check vs source / domain rules) |
| **Consistency** | Do values agree across systems / over time? |
| **Timeliness** | Is data current enough for use? |
| **Uniqueness** | Are duplicates absent? (Primary key violations) |
| **Validity** | Do values conform to expected type / range / pattern? |

> "Data quality" without dimensions is vague. Test against each dimension explicitly.

#### Schema validation libraries

| Tool | Best for |
|---|---|
| **Great Expectations** | Production data pipelines; rich expectations, docs, integrations |
| **Pandera** | Pandas / Polars schemas as code; lightweight |
| **dbt tests** | SQL data warehouse pipelines |
| **TFDV** (TensorFlow Data Validation) | ML training data |
| **Pydantic** | Application-level data (API requests, configs) |
| **JSON Schema** | Cross-language validation |
| **deequ** (Spark) | Big data |
| **Soda Core / Soda Cloud** | Hosted data quality monitoring |

#### Pandera (lightweight, pandas-native)

```python
import pandera.pandas as pa
import pandas as pd

schema = pa.DataFrameSchema({
    "user_id": pa.Column(int, pa.Check.greater_than_or_equal_to(0), nullable=False),
    "email": pa.Column(str, pa.Check.str_matches(r"^[\w.-]+@[\w.-]+\.\w+$")),
    "age": pa.Column(int, [pa.Check.in_range(0, 120)]),
    "country": pa.Column(str, pa.Check.isin(["US", "UK", "DE", "FR"])),
    "signup_date": pa.Column(pa.DateTime),
    "lifetime_value": pa.Column(float, pa.Check.greater_than_or_equal_to(0), nullable=True),
})

# Validate
schema.validate(df, lazy=True)            # collects all failures, not just first
```

> **Lazy mode** reports all violations at once — much more useful than failing on the first.

#### Great Expectations (production-grade)

```python
import great_expectations as gx

context = gx.get_context()
suite = context.suites.add(gx.ExpectationSuite(name="user_data_v1"))

suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(column="user_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeUnique(column="user_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeBetween(column="age", min_value=0, max_value=120))
suite.add_expectation(gx.expectations.ExpectColumnDistinctValuesToBeInSet(column="country", value_set=["US","UK","DE"]))
suite.add_expectation(gx.expectations.ExpectColumnValuesToMatchRegex(column="email", regex=r"^[\w.-]+@[\w.-]+$"))
```

> Great Expectations auto-generates **HTML data docs** showing pass/fail for each expectation — great for stakeholder visibility.

#### Common expectations / checks

| Check | Pandera | GE |
|---|---|---|
| Not null | `nullable=False` | `expect_column_values_to_not_be_null` |
| Unique | `unique=True` | `expect_column_values_to_be_unique` |
| Type | Column dtype | `expect_column_values_to_be_of_type` |
| Range | `Check.in_range(lo, hi)` | `expect_column_values_to_be_between` |
| Set | `Check.isin([...])` | `expect_column_distinct_values_to_be_in_set` |
| Regex | `Check.str_matches(...)` | `expect_column_values_to_match_regex` |
| Length | `Check.str_length(min, max)` | `expect_column_value_lengths_to_be_between` |
| Custom | `Check(lambda s: ...)` | `expect_column_pair_values_to_satisfy_business_logic` |
| Row count | `pa.Check.size_in_range(...)` | `expect_table_row_count_to_be_between` |
| Foreign key | Cross-table | `expect_column_values_to_be_in_set` w/ ref values |

#### dbt tests (warehouse-side)

```yaml
# schema.yml
models:
  - name: users
    columns:
      - name: user_id
        tests:
          - unique
          - not_null
      - name: email
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "email like '%@%'"
```

> dbt tests run as SQL queries; failures = rows that violate the assertion. Native to warehouse-centric ELT pipelines.

#### Statistical / drift checks

Beyond hard rules, monitor distributions over time:

| Check | What |
|---|---|
| **Mean / std drift** | Is column's mean changing month-over-month? |
| **PSI** (Population Stability Index) | Distribution shift between two periods |
| **KS test / Wasserstein** | Distributional equality |
| **Distinct value count** | New categories appearing |
| **Null rate over time** | Unexpected increase |
| **Correlation matrix changes** | Feature relationship drift |

```python
def psi(reference, current, bins=10):
    """Population Stability Index between two distributions."""
    ref_pct, _ = np.histogram(reference, bins=bins)
    cur_pct, _ = np.histogram(current, bins=bins)
    ref_pct = ref_pct / ref_pct.sum()
    cur_pct = cur_pct / cur_pct.sum()
    eps = 1e-6
    return np.sum((ref_pct - cur_pct) * np.log((ref_pct + eps) / (cur_pct + eps)))
```

| PSI value | Interpretation |
|---|---|
| < 0.1 | No significant change |
| 0.1–0.25 | Moderate drift — investigate |
| > 0.25 | Major drift — alert |

#### Profiling (auto-generated reports)

```python
from ydata_profiling import ProfileReport
ProfileReport(df, title="profile").to_file("profile.html")

# Or sweetviz for comparison reports
import sweetviz as sv
sv.compare([df_old, "old"], [df_new, "new"]).show_html("compare.html")
```

> Profile **once at project start** + **on each major data refresh** — catches drift early.

#### Pipeline integration

```python
# Run validation at every stage
def transform_users(df):
    raw_schema.validate(df, lazy=True)        # input contract
    df = df.assign(...)
    out_schema.validate(df, lazy=True)        # output contract
    return df
```

> **Validate at boundaries**: ingest, transform, output. Don't validate inside hot loops.

#### Data contracts

| Concept | Detail |
|---|---|
| **Producer-consumer agreement** | Schema + SLA for upstream → downstream |
| Versioned | Schema changes are explicit; consumers opt-in |
| Tested in CI | Breaking changes caught pre-merge |
| Includes nullability, ranges, formats | Goes beyond column types |
| Documented | Living spec, not tribal knowledge |

#### Anti-patterns

| Anti-pattern | Fix |
|---|---|
| "We'll catch it in QA" | Test data automatically, every run |
| Quality checks only at dashboards (downstream) | Catch at source |
| Single end-to-end test | Test each pipeline stage |
| Ignoring small drift | PSI / KS-test to surface gradual change |
| Hand-written checks per pipeline | Use a framework (GE / Pandera) |
| No alerting | Wire to Slack / PagerDuty |
| Pass/fail-only reports | Show stats — what changed, by how much |

#### Severity tiers

| Severity | Action |
|---|---|
| **Block** (P0) | Halt pipeline; alert immediately (e.g., null `user_id`) |
| **Warn** (P1) | Log and alert; pipeline continues (e.g., 0.1% null in non-key field) |
| **Info** (P2) | Logged only (e.g., distribution slight shift) |

#### Data quality KPIs

| KPI | Definition |
|---|---|
| **Test coverage** | % of tables with ≥ 1 quality test |
| **Pass rate** | % of test runs passing |
| **MTTR** | Mean time to detect + resolve quality incidents |
| **Drift incidents / month** | How often distributions shift |
| **Stale data alerts** | Late-arriving data |

#### Data lineage

| Tool | Use |
|---|---|
| **OpenLineage** | Open standard for lineage events |
| **Marquez** | Lineage server |
| **dbt + dbt-docs** | Built-in lineage for warehouse models |
| **Datahub / Amundsen / OpenMetadata** | Enterprise data catalog with lineage |

> Lineage tells you "what breaks downstream if this column changes" — essential for governance.

#### When to escalate

| Trigger | Escalate to |
|---|---|
| Source-system bug | Owner of the source |
| Schema breakage | Producer team (data contract violation) |
| Distribution drift | ML team / metric owner |
| Late data | SRE / pipeline owner |
| Persistent failures | Engineering manager / data lead |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| Tests in production but no alerts | Wire failures to on-call |
| Validating only after model fails | Test data first |
| Skipping checks "to save time" | Saves no time vs broken downstream |
| Ignoring tests when CI is red | Fix or remove — never disable silently |
| Treating "warning" as ignorable | Track warning rate; rising = real |
| Schema in docs, not code | Code is source of truth |
| Single test catching multiple things | One assertion per check |
| No regression tests | Replays of past failures |

#### Code: a Pandera schema + GE expectation hybrid

```python
import pandera.pandas as pa

schema = pa.DataFrameSchema({
    "order_id": pa.Column(int, [pa.Check.greater_than(0)], nullable=False, unique=True),
    "amount":   pa.Column(float, [pa.Check.between(0, 100_000), pa.Check.notna()]),
    "status":   pa.Column(str, [pa.Check.isin(["pending","paid","refunded"])]),
    "ts":       pa.Column(pa.DateTime),
})
schema.validate(df, lazy=True)            # raises with all errors
```

#### Where DQ lives in a stack

```
sources → ingest → DQ checks → staging → DQ checks → models / features → DQ checks → serving
                                                                                       └ monitoring drift
```

**Rule of thumb:** **test data like you test code** — at every pipeline boundary, with explicit assertions tied to the **six DQ dimensions** (completeness, accuracy, consistency, timeliness, uniqueness, validity). Use **Pandera** for in-Python pipelines, **Great Expectations** for production with stakeholder visibility, **dbt tests** for warehouse, **PSI / KS** for drift. **Validate inputs and outputs**; **alert on failures**; **track pass-rate as a KPI**.
