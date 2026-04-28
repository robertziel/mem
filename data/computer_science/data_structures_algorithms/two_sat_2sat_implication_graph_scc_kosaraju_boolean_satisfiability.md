### 2-SAT (boolean satisfiability with 2 literals per clause, implication graph, SCC)

**When:** decide whether a CNF formula with **at most 2 literals per clause** is satisfiable, and find a satisfying assignment if so. Polynomial-time (unlike 3-SAT, which is NP-complete). Used for: scheduling with binary constraints, conflict resolution, 2-coloring with constraints, "either A or B" decision graphs.

**Schema:**

| Concept | Detail |
|---|---|
| Variable `xᵢ` | Boolean; literals are `xᵢ` (true) and `¬xᵢ` (false) |
| Clause `(a ∨ b)` | Equivalent to **two implications**: `¬a ⇒ b` and `¬b ⇒ a` |
| Implication graph | 2N nodes (literal `xᵢ` and `¬xᵢ`); edge `u ⇒ v` for each implication |
| SAT condition | For every variable `xᵢ`: `xᵢ` and `¬xᵢ` are **NOT in the same SCC** |
| Assignment | If `xᵢ`'s SCC comes **after** `¬xᵢ`'s in reverse topological order → assign `xᵢ = true`, else false |

> **2-SAT in O(N + M)** via Tarjan / Kosaraju SCC.

#### Implication graph encoding

For each clause `(a ∨ b)` (where `a, b` are literals):

```
add_edge(¬a, b)        # if ¬a is true (a is false), b must be true
add_edge(¬b, a)        # if ¬b is true (b is false), a must be true
```

For "must be true" (forced): `(a ∨ a)` → `add_edge(¬a, a)`.
For "must be false" (forced): `(¬a ∨ ¬a)` → `add_edge(a, ¬a)`.
For "exactly one of a, b": `(a ∨ b) ∧ (¬a ∨ ¬b)` (XOR).

**Indexing convention:** for variable `i ∈ [0, N)`:
- `2i` = literal `xᵢ` (true)
- `2i + 1` = literal `¬xᵢ` (false)
- "Negate literal `u`" = `u ^ 1`

#### Implementation (Kosaraju-based)

```python
from collections import defaultdict

class TwoSAT:
    def __init__(self, n):
        self.n = n
        self.graph = defaultdict(list)                # implication graph
        self.rev   = defaultdict(list)

    def _add_imp(self, u, v):
        self.graph[u].append(v)
        self.rev[v].append(u)

    def add_clause(self, a, na, b, nb):
        """Clause (a ∨ b). a, b ∈ [0, N); na/nb = True if literal is *negated*."""
        la = 2*a + (1 if na else 0)                   # literal index
        lb = 2*b + (1 if nb else 0)
        self._add_imp(la ^ 1, lb)                     # ¬a ⇒ b
        self._add_imp(lb ^ 1, la)                     # ¬b ⇒ a

    def force_true(self, a):
        la = 2*a; self._add_imp(la ^ 1, la)           # ¬a ⇒ a

    def force_false(self, a):
        la = 2*a; self._add_imp(la, la ^ 1)           # a ⇒ ¬a

    def solve(self):
        N2 = 2 * self.n
        order = []; visited = [False] * N2
        def dfs1(u):
            stack = [(u, 0)]
            while stack:
                v, i = stack.pop()
                if i == 0:
                    if visited[v]: continue
                    visited[v] = True
                if i < len(self.graph[v]):
                    stack.append((v, i + 1))
                    w = self.graph[v][i]
                    if not visited[w]: stack.append((w, 0))
                else:
                    order.append(v)
        for u in range(N2):
            if not visited[u]: dfs1(u)
        comp = [-1] * N2
        def dfs2(u, c):
            stack = [u]
            while stack:
                v = stack.pop()
                if comp[v] != -1: continue
                comp[v] = c
                for w in self.rev[v]:
                    if comp[w] == -1: stack.append(w)
        cid = 0
        for u in reversed(order):
            if comp[u] == -1:
                dfs2(u, cid); cid += 1
        # check + assignment
        assignment = [False] * self.n
        for i in range(self.n):
            if comp[2*i] == comp[2*i + 1]: return None     # UNSAT
            assignment[i] = comp[2*i] > comp[2*i + 1]      # true if x's component is later
        return assignment
```

> The **assignment rule**: in **reverse topological order** of SCCs, assign `xᵢ = true` if `comp[xᵢ] > comp[¬xᵢ]` (Kosaraju's `cid` is reverse-topo, since DFS-2 starts from highest `order`).

#### Why this works

| Property | Argument |
|---|---|
| **Same SCC = forced equal** | If `xᵢ ⇒ ¬xᵢ` and `¬xᵢ ⇒ xᵢ`, both must hold simultaneously — contradiction unless they're in same SCC, which is unsat |
| **Different SCC = consistent** | Pick the literal whose SCC is later (closer to terminal) — implications can only flow in topological order |
| **No "isolated" variables** | Always assignable; just pick any consistent valuation |

#### Use cases

| Problem | 2-SAT encoding |
|---|---|
| **Choose A or B** for each item with binary constraints | Variable per item; clauses per constraint |
| Boolean tournament prediction | "Either team A wins or team B wins" |
| Truck routing left / right | Each truck = boolean; conflicts as clauses |
| 2-coloring with constraints | Each node = boolean; edges = `(¬a ∨ ¬b)` (different colors) or `(a ∨ b)` (at least one true) |
| Implication chains in logic puzzles | Direct |
| Constraint solver for binary decisions | 2-SAT scales much better than SAT |
| Fix orientations in a partially-oriented graph | Each edge = literal |
| 2-SAT-modeled scheduling (do task A or B at slot t) | Variable per (task, choice); slot conflicts as clauses |

#### Common clause patterns

| English | 2-SAT clause(s) |
|---|---|
| `a ∨ b` (at least one) | `(a ∨ b)` |
| `a → b` (implication) | `(¬a ∨ b)` |
| `a ↔ b` (equivalence) | `(¬a ∨ b) ∧ (a ∨ ¬b)` |
| `a XOR b` (exactly one) | `(a ∨ b) ∧ (¬a ∨ ¬b)` |
| `¬a ∧ ¬b` (both false) | `(¬a ∨ ¬a) ∧ (¬b ∨ ¬b)` (force) |
| "Forbid `a ∧ b`" | `(¬a ∨ ¬b)` |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Forgetting one direction of the implication | **Both** `¬a ⇒ b` and `¬b ⇒ a` per clause |
| Comparing literal indices instead of SCC indices | Compare `comp[2i]` vs `comp[2i+1]` |
| Wrong assignment rule (later vs earlier SCC) | The literal whose SCC is **later in reverse topo (= higher `cid` in Kosaraju)** is true |
| 3-SAT in disguise | If the problem has 3-literal clauses, it's NP-complete; can't use 2-SAT |
| Variable count off-by-one | Use `2 * N` nodes; `xᵢ` at `2i`, `¬xᵢ` at `2i + 1` |
| Recursion depth on big N | Use iterative SCC (Tarjan iterative or Kosaraju with explicit stacks) |

#### Complexity

| Op | Cost |
|---|---|
| Build implication graph | O(M) for M clauses |
| SCC via Kosaraju / Tarjan | O(N + M) |
| Total | **O(N + M)** |
| Memory | O(N + M) |

**Rule of thumb:** **2-SAT = SCC on implication graph**. Encode each clause as **two implications**, build the graph, find SCCs, check that **`xᵢ` and `¬xᵢ` are in different SCCs** for every variable. Assignment rule: pick the literal whose SCC comes **later in reverse topological order**. In O(N + M). For 3-SAT or higher arity, fall back to a **SAT solver** (CDCL).
