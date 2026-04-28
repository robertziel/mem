### DAGs (Directed Acyclic Graph — d-separation, backdoor / frontdoor, Pearl, SCM)

**When:** decide **which variables to control for** in a causal analysis. The DAG framework (Pearl) makes confounding, mediation, and collider bias explicit. Without a DAG you're guessing — and "control for everything" is provably wrong.

**Schema:**

| Concept | Detail |
|---|---|
| **Node** | A variable (treatment T, outcome Y, covariates X, …) |
| **Edge** `A → B` | "A causes B" (direct effect) |
| **Path** | Sequence of edges (regardless of direction) |
| **Causal path** | Path with all edges going one direction (T → … → Y) |
| **Backdoor path** | Non-causal path connecting T and Y, starting with edge **into** T |
| **Confounder** | Variable that's a common cause of both T and Y |
| **Mediator** | Variable on the causal path between T and Y |
| **Collider** | Variable with two arrows pointing **into** it |

> **Pearl's framework**: structural causal model + DAG + do-calculus. Lets you reason graphically about which variables to condition on.

#### Three structural building blocks

| Pattern | Diagram | Behavior |
|---|---|---|
| **Chain (mediator)** | `A → B → C` | A and C correlated; **conditioning on B blocks the flow** |
| **Fork (common cause)** | `A ← B → C` | A and C correlated **(spurious)**; **conditioning on B removes correlation** |
| **Collider** | `A → B ← C` | A and C **independent**; **conditioning on B opens a spurious path** |

> **Conditioning on a collider creates correlation that wasn't there.** Most-violated rule in observational analysis.

#### d-separation

A path is **blocked** if either:

| Block via | Condition |
|---|---|
| Conditioning on a non-collider | Chain or fork node on the path is in the conditioning set |
| **Not** conditioning on a collider (and none of its descendants) | Collider blocks by default |

`A` and `B` are **d-separated** by set `Z` if **all paths** between them are blocked by `Z` ⇒ `A ⊥ B | Z`.

> **d-separation is the graphical criterion for conditional independence.** Read causal independence off the DAG.

#### Backdoor criterion (the workhorse)

To estimate the causal effect of `T` on `Y`, find a set `Z` such that:

| Condition | Detail |
|---|---|
| 1 | `Z` blocks all **backdoor paths** from `T` to `Y` (paths starting with an arrow into T) |
| 2 | `Z` contains no descendants of `T` (otherwise we'd block the causal path or condition on a mediator) |

If such `Z` exists, conditioning on `Z` (e.g., regression / matching / IPW) recovers the causal effect.

**Practical workflow:**

| Step | Action |
|---|---|
| 1 | Draw the DAG based on domain knowledge |
| 2 | Identify all paths between `T` and `Y` |
| 3 | Mark each as causal or backdoor |
| 4 | Find a set `Z` that blocks every backdoor and contains no T-descendants |
| 5 | Adjust for `Z` |

#### Examples

**Example 1 — confounder:**

```
T ← X → Y
T → Y
```

`X` is a backdoor (via `T ← X → Y`). **Adjust for X** to get the causal effect.

**Example 2 — mediator (don't adjust):**

```
T → M → Y
```

If we want the **total** effect of T on Y, **don't adjust for M** — that would block the causal path.

**Example 3 — collider (don't adjust):**

```
T → C ← Y
```

`C` is a collider on path `T → C ← Y`. Adjusting for `C` opens a spurious path between `T` and `Y`. **Don't condition on C**.

**Example 4 — M-bias:**

```
T ← U₁ → C ← U₂ → Y
```

`C` is a collider; conditioning on it **opens** a backdoor through `U₁ → C ← U₂`. Even though `C` looks like a "covariate", **don't include it**.

**Example 5 — frontdoor (when backdoor is blocked):**

```
T → M → Y
T ← U → Y    (U unmeasured)
```

Backdoor through `U` is unblocked (we can't see U). But if `M` is the **only** mediator and unconfounded, the **frontdoor formula** identifies the effect:

`P(Y | do(T)) = Σ_m P(M=m | T) · Σ_t' P(Y | T=t', M=m) · P(T=t')`

> Frontdoor adjustment is rare in practice but powerful — it identifies the causal effect through the mediator without observing the confounder.

#### do-calculus (Pearl's three rules)

Operations on `P(Y | do(X), Z)` to manipulate causal expressions:

| Rule | What |
|---|---|
| **Rule 1** (insertion / deletion of observations) | Drop a conditioning variable if it's d-separated under intervention graph |
| **Rule 2** (action / observation exchange) | Convert `do(X)` to observational `X` if no confounding path |
| **Rule 3** (insertion / deletion of actions) | Drop `do(X)` if X has no effect on Y under intervention graph |

> If you can reduce `P(Y | do(T))` to a purely observational expression using these rules, the effect is **identifiable**.

#### Bias types — at a glance

| Bias | Cause | Detection / fix |
|---|---|---|
| **Confounding** | Common cause of T and Y | Adjust for the confounder |
| **Selection bias** | Conditioning on a collider | Don't condition on it |
| **M-bias** | Conditioning on a collider with unobserved parents | Don't condition |
| **Mediator-blocking** | Adjusting for a mediator when wanting total effect | Don't adjust for it |
| **Time-varying confounding** | Confounder both effect and cause | Use marginal structural models / G-methods |
| **Reverse causation** | Y → T arrow | Use IV / RDD / longitudinal |

#### Software

```python
# DoWhy — Microsoft's causal inference library
from dowhy import CausalModel
model = CausalModel(
    data=df,
    treatment="T",
    outcome="Y",
    graph="""digraph { U -> T; U -> Y; T -> Y; X -> T; X -> Y; }""",
)
identified_estimand = model.identify_effect()    # uses do-calculus
estimate = model.estimate_effect(identified_estimand, method_name="backdoor.propensity_score_matching")
refute = model.refute_estimate(identified_estimand, estimate, method_name="placebo_treatment_refuter")
```

| Library | Use |
|---|---|
| **DoWhy** (Microsoft) | DAG-aware identification + estimation + refutation |
| **CausalPy** (PyMC) | Bayesian causal inference |
| **EconML** (Microsoft) | Heterogeneous treatment effects, ML-based |
| **Causalinference** | Lighter-weight matching / IPW |
| **DAGitty** (web tool) | Visual DAG editor; identifies adjustment sets |

#### Common pitfalls

| Mistake | Fix |
|---|---|
| **"Control for everything"** | Conditioning on colliders / mediators introduces bias |
| Adjusting for a mediator when wanting total effect | Don't include it (or distinguish total / direct effects) |
| Adding "more covariates" without thinking | Each could be confounder, mediator, or collider — depends on DAG |
| Using post-treatment variables as controls | Almost always wrong |
| Treating instrumental variables as confounders | They're a separate identification strategy |
| Drawing a DAG to fit your conclusions | DAG should reflect domain knowledge, not be reverse-engineered |
| Ignoring unobserved variables | Add them as nodes; they constrain identifiability |
| Assuming d-separation = independence | Holds **under the DAG's assumed model**; DAG could be wrong |

#### Workflow when you suspect causal claim

| Step | Action |
|---|---|
| 1 | Draw a DAG from domain knowledge (assumed structure) |
| 2 | Identify backdoor paths between T and Y |
| 3 | Find a valid adjustment set `Z` (or determine effect is not identifiable) |
| 4 | If identifiable, estimate using regression / matching / IPW conditioning on `Z` |
| 5 | Run sensitivity analysis to unmeasured confounding |
| 6 | Compare DAGs that differ in plausible structure; check robustness |

#### Identifiability

| Outcome | Implication |
|---|---|
| **Identifiable** under the DAG | A valid adjustment set exists; effect can be estimated |
| **Not identifiable** | No combination of observed variables suffices; effect cannot be recovered without additional assumptions / data |

> The DAG tells you **whether** the data can answer the question — before any modeling.

#### Why DAGs over the "throw everything in regression" approach

| Approach | Risk |
|---|---|
| **Regression with all covariates** | May condition on colliders / mediators → bias |
| **Stepwise variable selection** | Statistical, not causal — selects predictors, not adjusters |
| **DAG-based identification** | Each variable's role (confounder / mediator / collider) is explicit |

> DAG = "the **right** set of controls"; regression p-values = "what predicts Y". Different problems.

#### Counterfactuals (level-3 of Pearl's ladder)

| Level | Question | Method |
|---|---|---|
| 1. Association | "What is P(Y | T)?" | Statistics |
| 2. Intervention | "What is P(Y | do(T))?" | Causal inference |
| 3. Counterfactual | "What would Y have been if T had been different, given what actually happened?" | SCM with counterfactual |

#### Drawing DAGs in code

```python
import networkx as nx
G = nx.DiGraph([
    ("U", "T"), ("U", "Y"),
    ("X", "T"), ("X", "Y"),
    ("T", "M"), ("M", "Y"),
])
```

**Rule of thumb:** **draw the DAG before any analysis**. **Backdoor criterion**: find a set `Z` that blocks all backdoor paths and contains no T-descendants. **Don't condition on colliders or mediators**. "Control for everything" is provably wrong — each covariate's role (confounder / mediator / collider) is set by the DAG. Use **DoWhy / DAGitty** for tooling. The DAG is **assumed**; check robustness across plausible alternatives.
