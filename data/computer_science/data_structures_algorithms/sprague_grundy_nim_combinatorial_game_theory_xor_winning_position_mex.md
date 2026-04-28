### Sprague-Grundy / Nim (combinatorial game theory, XOR, winning position, mex)

**When:** analyze **impartial two-player games with perfect information** — Nim, stone-removal games, divisor games, certain board variants. Determine winner from a position; compute optimal moves. The general-purpose theory of "is this a winning or losing position?".

**Schema:**

| Concept | Detail |
|---|---|
| Impartial game | Both players have the **same** moves available; outcome decided by who moves last |
| Normal play | The player who **can't move** loses |
| Misère play | The player who **moves last** loses (different theory!) |
| **Position** | A game state |
| **Grundy number / nimber** `g(s)` | A non-negative integer summarizing the position |
| **mex** | Minimum excludant — smallest non-negative integer NOT in a set |
| **P-position** (losing for player-to-move) | `g(s) = 0` |
| **N-position** (winning) | `g(s) ≠ 0` |

> **Sprague-Grundy theorem.** Every impartial game (under normal play) is **equivalent to Nim** with a single pile of size `g(s)`. The Grundy number is the unique tool you need.

#### Computing Grundy numbers

```python
def grundy(state):
    moves = list(possible_moves(state))
    if not moves: return 0                            # losing position (no moves)
    return mex({grundy(apply(state, m)) for m in moves})

def mex(s):
    i = 0
    while i in s: i += 1
    return i
```

> **Memoize** with `@lru_cache` for any practical use. State space size dominates the cost.

#### Sum of independent games — XOR rule

If a game decomposes into independent sub-games (you make a move in **one** of them per turn):

> **`g(G₁ + G₂ + …) = g(G₁) ⊕ g(G₂) ⊕ …`**

This is the entire content of **Nim**: each pile is an independent sub-game with `g(pile of n) = n`.

> **You're in a winning position iff the XOR of all sub-games' Grundy numbers ≠ 0.**

#### Nim — the canonical example

| Position | Grundy |
|---|---|
| Single pile of `n` stones (remove ≥ 1 per move) | `g = n` |
| Multiple piles | XOR of pile sizes |

**Strategy:** if XOR ≠ 0, find a pile whose binary XOR-with-overall-XOR is smaller; remove that many stones to flip XOR to 0. Hand opponent a P-position.

#### Examples

| Game | Grundy formula |
|---|---|
| Nim | `g(piles) = ⊕ pile_sizes` |
| **Take-1-or-2** (1 pile) | `g(n) = n mod 3` |
| **Take-1-2-or-3** | `g(n) = n mod 4` |
| Mock Turtles, Wythoff's, etc. | Specific lookup |
| Green Hackenbush | Forest game, recursive XOR |
| Last-stone-wins from a heap with custom moves | Compute via mex recursion |
| Game on a DAG | `g(v) = mex over edges (v→u) of g(u)` |
| Two stones on a path; move toward each other | Position = distance; computed via mex |
| Subtraction game with set `S` | `g(n) = mex({g(n - s) for s in S, n - s ≥ 0})` |
| Nim with split (Sprague-Grundy of split games) | Sum / XOR |

#### Subtraction games

Given a set `S = {s₁, s₂, …}` of allowed subtractions:

```python
from functools import lru_cache

def grundy_subtraction(N, S):
    @lru_cache(maxsize=None)
    def g(n):
        return mex({g(n - s) for s in S if n - s >= 0})
    return [g(i) for i in range(N + 1)]
```

> Often **periodic** in `n` after a few values — print the table to spot the pattern.

#### Compound games

| Move type | Theory |
|---|---|
| Each turn: move in **one** sub-game | XOR rule |
| Each turn: move in **all** sub-games (conjunctive) | More complex; not just XOR |
| Each turn: pick any sub-game and **add or remove** | Different — usually problem-specific |
| Misère convention | XOR rule **fails** generally; only works for Nim with a special rule |

#### Hackenbush (red-blue-green) — generalized

For partisan games (each player has different moves), Sprague-Grundy doesn't directly apply. Use **surreal numbers** / **Conway's combinatorial game theory** instead.

#### Algorithm for finding a winning move

```python
def winning_move(state):
    if not is_winning(state): return None             # all moves lead to winning state for opp
    for m in possible_moves(state):
        new_state = apply(state, m)
        if grundy(new_state) == 0: return m           # hand opp a P-position
    return None
```

#### Patterns map

| Phrasing | Use |
|---|---|
| "Two players take turns; can you guarantee a win?" | Compute Grundy from current position |
| "Independent piles / sub-games" | XOR rule |
| "Game on a DAG; reach a terminal" | `g(v) = mex over outgoing` |
| "Subtraction game" | DP on `n` with mex |
| "Find an optimal move" | Find any move leading to a `g = 0` position |
| "Game state is huge; find a pattern" | Print Grundy values for small inputs; look for periodicity |
| "Misère version" | Special-case Nim (heap of 1's); otherwise harder theory |

#### Game-theory cheat sheet

| Term | Meaning |
|---|---|
| Impartial | Both players have same moves |
| Partisan | Different moves per player (chess, checkers — outside SG) |
| Normal | Last to move wins |
| Misère | Last to move loses |
| P-position | Previous player wins (current player loses) — `g = 0` |
| N-position | Next player wins — `g ≠ 0` |
| Grundy / nimber | XOR-additive integer |
| mex | Min excluded non-negative integer |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Applying SG to **partisan** games | SG works for **impartial** games only |
| Using XOR rule in **misère** Nim | Doesn't work — special rule needed |
| Forgetting `g(terminal) = 0` | Base case for losing position |
| Off-by-one in mex (`{0, 1, 2}` mex = 3, `{1, 2, 3}` mex = 0) | mex starts at **0** |
| Computing Grundy for huge state space | Look for periodicity / closed form |
| Confusing P / N positions | P = previous player wins (you-to-move lose) |

#### Complexity

| Op | Cost |
|---|---|
| Grundy via DP | O(state space × move count) |
| XOR of Grundy of sub-games | O(#sub-games) |
| Subtraction-game table | O(N · |S|) |
| Detect periodicity | Print first few hundred values |

**Rule of thumb:** **Grundy number = mex over the moves' Grundy numbers**; **XOR them across independent sub-games**. **Win iff total XOR ≠ 0**. To find a winning move, find one that hands the opponent a `g = 0` position. **Sprague-Grundy applies to impartial, normal-play games**. For partisan or misère, the theory is harder; consult Conway / Berlekamp.
