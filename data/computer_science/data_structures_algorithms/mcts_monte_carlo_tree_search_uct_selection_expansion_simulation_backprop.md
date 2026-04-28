### MCTS (Monte Carlo Tree Search — UCT, selection, expansion, simulation, backprop)

**When:** game-tree search where the branching factor is **huge** or the evaluation function is **hard to write** — Go, modern board games, complex strategy games. Hybrid with deep neural networks (AlphaGo / AlphaZero) is the current state-of-the-art for many games.

**Schema (the four phases per iteration):**

| Phase | Action |
|---|---|
| **1. Selection** | Walk down from root using the **UCB1** score: `Q(s, a) + c·√(ln N(s) / N(s, a))` |
| **2. Expansion** | When you reach a node with unexplored children, add one child to the tree |
| **3. Simulation (rollout)** | Play out random moves (or use a quick policy) to a terminal state |
| **4. Backpropagation** | Update visit counts and value estimates back along the path |

| Symbol | Meaning |
|---|---|
| `N(s)` | Number of times node `s` was visited |
| `N(s, a)` | Times action `a` was taken from `s` |
| `Q(s, a)` | Mean return after taking `a` from `s` |
| `c` | Exploration constant (≈ √2 for UCT) |

> **UCB1 balances exploitation** (high `Q`) **and exploration** (low `N`). Iterate until time runs out; pick the **most-visited** child of the root as the move.

#### Implementation — four-phase loop

```python
import math, random
C = math.sqrt(2)

def mcts(root_state, iterations):
    root = Node(root_state)
    for _ in range(iterations):
        node = root
        while not node.untried and node.children:                # 1. Selection (UCB)
            node = max(node.children, key=lambda c:
                       c.wins / c.visits + C * math.sqrt(math.log(node.visits) / c.visits))
        if node.untried:                                          # 2. Expansion
            node = expand(node)
        reward = rollout(node.state)                              # 3. Simulation
        backprop(node, reward)                                    # 4. Backprop
    return max(root.children, key=lambda c: c.visits).action      # most-visited at root
```

| Helper | Role |
|---|---|
| `Node` | Holds `state, parent, children, wins, visits, untried` (list of moves) |
| `uct_select(node)` | Max over children of `Q + C·√(ln N / n)` |
| `expand(node)` | Pop from `untried`, create + attach child |
| `rollout(state)` | Random play to terminal; return reward from POV |
| `backprop(node, r)` | Walk to root, increment `visits`, accumulate `wins`, **flip sign** each level |
| Move selection | **Max visits** (more robust than max Q) |

> AlphaZero-style **PUCT**: replace the UCB term with `Q + c · P(s, a) · √N / (1 + N(s, a))` where `P` comes from a policy net; replace random rollout with a **value net** evaluation at the leaf.

#### Selection variants beyond UCB1

| Variant | What |
|---|---|
| **UCT** (UCB applied to trees) | Standard MCTS selection |
| **PUCT** (used by AlphaZero) | `Q + c · P(s, a) · √N / (1 + N(s, a))` — uses prior probabilities `P` from a neural net |
| **Bayesian UCT** | Track full posterior over Q |
| **RAVE / AMAF** | "All Moves As First" — credit a move when seen anywhere in the rollout |

#### Hybrid with neural networks (AlphaGo / AlphaZero / MuZero)

| Component | Role |
|---|---|
| **Policy net** | Outputs `P(a | s)`; replaces uniform random in expansion + improves PUCT prior |
| **Value net** | Outputs `V(s)`; replaces or augments rollout return |
| **No rollouts** (AlphaZero) | Use value net at each leaf instead of random simulation |
| Self-play training | Generate games via MCTS; train nets on visit-distribution and game outcomes |

> The big leap from AlphaGo to AlphaZero: drop human-designed rollouts; just use the value net. **MuZero** drops the dynamics model — learn it too.

#### MCTS vs minimax + alpha-beta

| Aspect | MCTS | Minimax + α-β |
|---|---|---|
| Branching factor | High (Go: 250+) | Low / medium (chess: ~35) |
| Evaluation function | **Optional** (rollout substitutes) | Required at cutoffs |
| Convergence | Asymptotic — eventually optimal | Optimal at full depth |
| Time control | Anytime (iterate until time runs out) | Iterative deepening for anytime |
| Pruning | Implicit (low-visit branches) | Explicit (alpha / beta) |
| Tactical games (chess) | Worse without strong nets | **Better** with eval |
| Strategic / high-branch games (Go) | **Better** | Worse |

#### Use cases

| Domain | Notes |
|---|---|
| Go | AlphaGo / AlphaZero |
| Chess | Stockfish (alpha-beta) > AlphaZero in some endgames; AlphaZero in middlegame |
| Atari games | MuZero |
| Real-time strategy | Hybrid w/ heuristics |
| Combinatorial planning | TSP, scheduling — MCTS with rollouts |
| RL exploration | UCB-based action selection |
| Drug discovery / molecule design | MCTS over fragment lattices |
| Theorem proving | MCTS over proof states |

#### Complexity

| Op | Cost |
|---|---|
| Per iteration | O(depth) for selection + O(rollout length) for simulation |
| Memory | O(visits in tree) — grows with iterations |
| Convergence | Asymptotic to minimax with infinite iterations |

#### Pitfalls

| Mistake | Fix |
|---|---|
| Random rollout in tactical game | Bad → wins are noise; add tactical hints / eval net |
| Choosing root action by max **Q** | Use **max visits** — more robust to noise |
| Wrong reward sign on backprop | Alternate POV every level (`reward = -reward`) |
| Tree memory explodes | Use transposition tables / drop low-visit subtrees |
| `c` (exploration) too small | Greedy → stuck in suboptimal subtree |
| `c` too big | Too exploratory → poor exploitation |
| Forgetting to expand only one child per iteration | Standard MCTS expands one untried per iteration |
| Comparing MCTS to alpha-beta on chess naively | MCTS without strong eval / nets is much weaker on chess |

**Rule of thumb:** MCTS = **selection (UCB) → expansion → simulation → backprop**. Iterate until time / iteration limit, then **pick the most-visited child of the root**. Excels when **branching is huge** and **eval is weak**. **AlphaZero-style PUCT** with a learned policy / value net is the modern variant — drops random rollouts in favor of neural evaluation.
