### Minimax + Alpha-Beta Pruning (game tree search, zero-sum, negamax, iterative deepening)

**When:** two-player **zero-sum, perfect-information** games — chess, checkers, tic-tac-toe, connect-4, Othello, Go (with MCTS hybrid). Search a game tree, alternating max / min, prune branches that can't improve the answer.

**Schema:**

| Concept | Detail |
|---|---|
| Game tree | Nodes = positions; children = legal moves |
| Max player | Maximizing the evaluation (you) |
| Min player | Minimizing it (opponent) |
| Evaluation `eval(p)` | Heuristic score at leaf / cutoff (positive = max-player advantage) |
| Depth `d` | Plies remaining to search |
| Alpha (`α`) | Best value max-player can guarantee so far |
| Beta (`β`) | Best value min-player can guarantee so far |
| Cutoff | If `α ≥ β`, prune the rest of this node's children |

#### Plain minimax (no pruning)

```python
def minimax(pos, depth, maxer):
    if depth == 0 or terminal(pos): return eval(pos)
    if maxer:
        best = -float('inf')
        for child in moves(pos):
            best = max(best, minimax(child, depth - 1, False))
        return best
    else:
        best = float('inf')
        for child in moves(pos):
            best = min(best, minimax(child, depth - 1, True))
        return best
```

#### Alpha-beta pruning (the canonical optimization)

```python
def alphabeta(pos, depth, alpha, beta, maxer):
    if depth == 0 or terminal(pos): return eval(pos)
    if maxer:
        v = -float('inf')
        for child in moves(pos):
            v = max(v, alphabeta(child, depth - 1, alpha, beta, False))
            alpha = max(alpha, v)
            if alpha >= beta: break              # beta cutoff
        return v
    else:
        v = float('inf')
        for child in moves(pos):
            v = min(v, alphabeta(child, depth - 1, alpha, beta, True))
            beta = min(beta, v)
            if alpha >= beta: break              # alpha cutoff
        return v

# call: alphabeta(start, depth, -inf, +inf, True)
```

#### Negamax (cleaner — both players maximize from their POV)

```python
def negamax(pos, depth, alpha, beta, color):
    if depth == 0 or terminal(pos): return color * eval(pos)
    v = -float('inf')
    for child in moves(pos):
        v = max(v, -negamax(child, depth - 1, -beta, -alpha, -color))
        alpha = max(alpha, v)
        if alpha >= beta: break
    return v
```

> Negamax replaces the symmetric max / min cases with a single function. Same algorithm, half the code.

#### Why alpha-beta works

> **The "best so far" for the parent dictates a window**. Once a child's value is known to fall outside `[α, β]`, the parent will not pick this branch — so further exploration is wasted.

Best-case pruning gives **O(b^(d/2))** instead of `O(b^d)` — effectively **searches twice as deep** in the same time. Requires good move ordering (try strong moves first).

#### Move ordering — the key to actual speedup

| Heuristic | What it does |
|---|---|
| **Captures and promotions first** | Tactical moves likely best |
| **Killer moves** | Moves that caused beta cutoffs at same depth — try them first |
| **History heuristic** | Moves that historically pruned well |
| **PV (principal variation) move first** | The best move from previous (shallower) iteration |
| **MVV-LVA** (chess) | Most Valuable Victim − Least Valuable Attacker |
| **Static evaluation order** | Sort children by quick eval before recursing |

#### Iterative deepening (the standard wrapper)

```python
def iterative_deepening(pos, max_depth, time_limit):
    best_move = None
    for d in range(1, max_depth + 1):
        if time_up(): break
        score, move = root_search(pos, d)
        best_move = move                         # always have a "best so far"
    return best_move
```

> Combined with **transposition tables** (cache positions seen at multiple depths), iterative deepening is **faster than fixed-depth** because it improves move ordering on each iteration.

#### Transposition table

```python
TT = {}                                          # zobrist_hash → (depth, score, flag, best_move)
EXACT, LOWER, UPPER = 0, 1, 2
```

Avoids re-searching positions reached by different move orders. **Essential** for serious chess / checkers engines.

#### Quiescence search

At the leaf, if the position is "noisy" (captures / checks pending), keep searching only those moves to avoid the **horizon effect** (cutting off mid-tactical-sequence and trusting a misleading eval).

#### Aspiration windows

Instead of searching with `[−∞, +∞]`, use a narrow window around the previous iteration's score. Faster on average; if it falls outside the window, re-search with a wider one.

#### Patterns map

| Use case | Adjustment |
|---|---|
| Tic-tac-toe | Plain minimax (small tree) |
| Connect-4 | Alpha-beta + bitboards + iterative deepening |
| Chess / Checkers / Reversi | All of the above + TT + killer / history + quiescence |
| Game with chance (backgammon) | Expectiminimax (chance nodes) |
| Imperfect info (poker) | Counterfactual regret minimization (CFR), not minimax |
| Very large branching (Go) | **MCTS** (Monte Carlo Tree Search) instead of minimax |
| Pursuit-evasion / multi-agent | Multi-player minimax (max^n) |

#### Minimax vs MCTS

| Concern | Minimax + α-β | MCTS |
|---|---|---|
| Best for | Low-medium branching, good eval available | High branching, eval expensive / unclear |
| Eval needed | Yes (heuristic at leaves / cutoffs) | Optional (rollouts can substitute) |
| Pruning | α-β | UCB + tree policy |
| Worst-case guarantee | None without full search | None |
| Examples | Chess, Connect-4 | Go, modern hybrids (AlphaGo) |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Searching too deep with no time limit | Iterative deepening + clock check |
| Bad move ordering | Alpha-beta degenerates to minimax — order moves first |
| Horizon effect (cutoff mid-tactic) | Quiescence search at leaves |
| Repeated positions over-counted | Transposition table with Zobrist hashing |
| Forgetting to negate in negamax | `−negamax(...)` and `(−beta, −alpha)` are easy to flip |
| Eval that's not symmetric | Make `eval(pos)` return + for "current side to move" winning |
| Naive ply count vs effective branching | Branching factor varies by phase; budget time, not depth |

#### Complexity

| Algorithm | Time | Notes |
|---|---|---|
| Minimax (no pruning) | O(b^d) | Always full tree |
| Alpha-beta (worst order) | O(b^d) | No pruning if children ordered worst-first |
| Alpha-beta (best order) | **O(b^(d/2))** | Prunes ~half the tree's depth |
| With TT, killer, history | Similar but lower constant | Practical 1000× faster |

**Rule of thumb:** **alpha-beta is minimax + cutoffs**. The cutoffs only help with **good move ordering** — sort children by quick eval / prior depth's best move. Wrap with **iterative deepening** for any-time behavior; add **transposition tables** for big speedup. **Negamax** is the same algorithm with cleaner code. For high-branching games, switch to **MCTS**.
