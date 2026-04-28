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

#### Implementation skeleton

```python
import math, random

class Node:
    __slots__ = ("state", "parent", "action", "children", "wins", "visits", "untried")
    def __init__(self, state, parent=None, action=None):
        self.state = state; self.parent = parent; self.action = action
        self.children = []
        self.wins = 0; self.visits = 0
        self.untried = list(state.legal_moves())

C = math.sqrt(2)

def uct_select(node):
    return max(node.children, key=lambda c:
               c.wins / c.visits + C * math.sqrt(math.log(node.visits) / c.visits))

def expand(node):
    move = node.untried.pop(random.randrange(len(node.untried)))
    child = Node(node.state.apply(move), parent=node, action=move)
    node.children.append(child)
    return child

def simulate(state):
    while not state.is_terminal():
        state = state.apply(random.choice(list(state.legal_moves())))
    return state.reward()                            # +1 / -1 / 0 from current player's POV

def backprop(node, reward):
    while node is not None:
        node.visits += 1
        node.wins += reward
        reward = -reward                             # alternate POV up the tree
        node = node.parent

def mcts(root_state, iterations):
    root = Node(root_state)
    for _ in range(iterations):
        node = root
        # Selection
        while not node.untried and node.children:
            node = uct_select(node)
        # Expansion
        if node.untried:
            node = expand(node)
        # Simulation
        reward = simulate(node.state)
        # Backprop
        backprop(node, reward)
    return max(root.children, key=lambda c: c.visits).action
```

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
