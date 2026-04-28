### Master Index — All Algorithmic Topics

Single-glance picker for live recall. Each cell points at a deep memo (search by any keyword in this category).

#### Big-O scale & practical limits

| Big-O | Name | Max N for ~1s |
|---|---|---|
| O(1) | Constant | — |
| O(log n) | Logarithmic | ~10¹⁸ |
| O(n) | Linear | ~10⁸ |
| O(n log n) | Linearithmic | ~10⁷ |
| O(n²) | Quadratic | ~10⁴ |
| O(n³) | Cubic | ~500 |
| O(2ⁿ) | Exponential | ~25 |
| O(n!) | Factorial | ~12 |

#### Data structure picker

| Need | Use | Lookup | Insert |
|---|---|---|---|
| O(1) access by index | Array | O(1) | O(1) end / O(n) middle |
| O(1) lookup by key | Hash map | O(1) avg | O(1) avg |
| Ordered range query / sorted iter | BST / TreeMap | O(log n) | O(log n) |
| Concurrent / lock-free ordered structure | Skip list (Redis ZSET, ConcurrentSkipListMap) | O(log n) expected | O(log n) expected |
| Ordered set with split / merge by key | Treap (or implicit treap for arrays) | O(log n) expected | O(log n) expected |
| Top-K, scheduling, k-way merge | Heap | O(log n) extract | O(log n) |
| Prefix queries / autocomplete | Trie | O(L) | O(L) |
| Components / equivalence classes | Union-Find | ~O(α(N)) | ~O(α(N)) |
| Range sum + point update | Fenwick (BIT) | O(log n) | O(log n) |
| Range sum/min + range update | Segment tree (lazy) | O(log n) | O(log n) |
| Range min / max / gcd, **static** array | Sparse table | **O(1) query** | O(n log n) build |
| Awkward range op (mode, distinct, K-th) | Sqrt decomposition / Mo's | O(√n) | O(√n) |
| K-th order statistic in range (online) | Persistent segment tree | O(log V) | O(log n) per update |
| Tree path queries / updates | Heavy-light decomposition + segment tree | O(log² n) | O(log² n) |
| Tree all-pairs aggregation | Centroid decomposition | O(n log n) total | — |
| Spatial NN / range, low-d (k ≤ 10) | K-D tree | O(log n) avg | O(log n) avg |
| Probabilistic membership at scale | Bloom filter (or Cuckoo) | O(k) hash | O(k) hash |
| Cardinality estimate | HyperLogLog | O(1) | O(1) |
| Frequency estimate | Count-min sketch | O(k) | O(k) |
| Set similarity (Jaccard) at scale | MinHash + LSH | O(K) | O(K · |S|) |
| Tamper-evident commitment to a set | Merkle tree | O(log n) proof | O(log n) update |
| FIFO order | Queue / deque | O(1) | O(1) |
| LIFO order | Stack | O(1) | O(1) |
| Both ends | Deque | O(1) | O(1) |
| O(1) move-to-front | Doubly linked list | O(1) given node | O(1) |

#### Technique picker (by question signature)

| Question shape | Technique |
|---|---|
| Sorted array, palindrome, container, pair sum | Two pointers |
| Subarray / substring with constraint | Sliding window |
| Many range-sum queries | Prefix sum |
| O(1) complement / count / group | Hash map |
| Cycle / middle / n-th from end (linked list) | Fast / slow pointer |
| Next greater / smaller element | Monotonic stack |
| Sliding-window max / min | Monotonic deque |
| Top-K elements / merge K lists | Heap |
| Find target in sorted array | Binary search |
| Smallest X with monotonic predicate | Binary search on answer |
| Range update + range query | Segment tree (lazy) |
| Single-element update + prefix query | Fenwick tree |
| Substring search, single pattern | KMP / Z |
| Substring search, rolling hash | Rabin-Karp |
| Many substring queries on one text | Suffix array + LCP |
| Random sample from a stream of unknown length | Reservoir sampling |
| Uniform random permutation | Fisher-Yates shuffle |
| Polynomial / big-int multiplication, convolution | FFT / NTT |

#### Graph algorithm picker (by edge weight & query)

| Phrasing | Use | Time |
|---|---|---|
| Shortest path, unit weights | BFS | O(V+E) |
| Shortest path, non-negative weights | Dijkstra | O((V+E) log V) |
| Shortest path with negative weights | Bellman-Ford | O(V·E) |
| All-pairs shortest path, V ≤ 500 | Floyd-Warshall | O(V³) |
| Weights ∈ {0, 1} | 0-1 BFS (deque) | O(V+E) |
| Goal-directed with heuristic | A* | O((V+E) log V) |
| Order tasks given prerequisites | Topological sort | O(V+E) |
| Connected components (undirected) | BFS / DFS / Union-Find | O(V+E) |
| Cycle in undirected graph | Union-Find / DFS back-edge | O(V+E) |
| Cycle in directed graph | DFS 3-color or Kahn `len < V` | O(V+E) |
| Minimum spanning tree | Kruskal (DSU) / Prim (heap) | O(E log E) |
| Strongly connected components | Tarjan / Kosaraju | O(V+E) |
| Bridges / articulation points | DFS with low-link | O(V+E) |
| Bipartite check | BFS / DFS 2-coloring | O(V+E) |
| Many LCA / K-th-ancestor queries on a rooted tree | Binary lifting (or Euler tour + sparse table) | O(log N) / O(1) per query |
| Max bipartite matching | **Hopcroft-Karp** | O(E·√V) |
| Min-cost perfect bipartite matching | Hungarian (Kuhn-Munkres) | O(n³) |
| Max flow / min cut / project selection | Edmonds-Karp / Dinic | O(V·E²) / O(V²·E) |
| Min-cost max flow (with edge costs) | MCMF (SPFA / Dijkstra + potentials) | O(F · V · E) |
| 2-SAT (boolean satisfiability, 2 literals / clause) | Implication graph + SCC | O(N + M) |
| Eulerian path / circuit (every edge once) | Hierholzer | O(V + E) |
| Shortest path between two specific nodes | **Bidirectional Dijkstra** | ~√V faster than plain |
| Global minimum cut (undirected, no s/t) | Stoer-Wagner | O(V³) |
| Directed MST (rooted arborescence) | Edmonds / Chu-Liu | O(V·E) |

#### Paradigm picker

| Question shape | Paradigm |
|---|---|
| Find ALL solutions / arrangements | Backtracking |
| Optimal value, overlapping subproblems | Dynamic programming |
| Optimal value, locally-optimal step proves global | Greedy |
| Big problem → independent halves | Divide & conquer |
| Optimal value, NP-hard at general n | **Branch and bound** (backtracking + admissible bounds) |

#### DP pattern picker

| Pattern | Shape | Examples |
|---|---|---|
| Linear 1D | `dp[i]` over a sequence | Climbing stairs, House robber, Decode ways |
| Grid 2D | `dp[i][j]` over a grid | Unique paths, Min path sum |
| 0/1 knapsack | Each item once; iterate W reverse | 0/1 knapsack, Subset sum, Partition |
| Unbounded knapsack | Items unlimited; iterate W forward | Coin change, Rod cutting |
| LIS | Build relative to previous picks | LIS (O(n²) or O(n log n)) |
| LCS / two-string | `dp[i][j]` match-or-skip | LCS, Edit distance |
| Interval DP | `dp[i][j]` over `[i..j]`; iterate length | Matrix chain, Burst balloons |
| Tree DP | Post-order; return multiple states | Diameter, House robber III |
| Bitmask DP | `dp[mask][last]` | TSP, Assignment |
| Digit DP | (position, tight, accumulator) | Digit-sum constraints |
| State-machine | `dp[i][state]` | Stock cooldown, k transactions |
| HMM decoding (max-product) | `δ[t][state]` + back-pointers | Viterbi: speech, POS, error correction |
| Probability | Float recurrence | Knight on chessboard, dice |

#### Sorting algorithm picker

| Algorithm | Avg | Worst | Stable | When |
|---|---|---|---|---|
| Timsort (default) | O(n log n) | O(n log n) | ✓ | Built-in; nearly-sorted gets O(n) |
| Quick sort | O(n log n) | O(n²) | ✗ | Fastest in practice on arrays |
| Merge sort | O(n log n) | O(n log n) | ✓ | Linked list, stability needed |
| Heap sort | O(n log n) | O(n log n) | ✗ | O(1) extra space |
| Insertion sort | O(n²) | O(n²) | ✓ | Small n or nearly sorted |
| Counting sort | O(n+k) | O(n+k) | ✓ | Small integer range |
| Radix sort | O(nk) | O(nk) | ✓ | Fixed-length keys |

#### Recursion / divide / conquer / greedy

| Topic | Use when |
|---|---|
| Recursion | Problem decomposes into smaller self-similar subproblems |
| Divide & conquer | Halves are independent; merge step is cheap (mergesort, quickselect) |
| Backtracking | Choose / explore / un-choose; need ALL solutions |
| Greedy | Locally optimal step provably reaches global optimum |
| DP | Overlapping subproblems + optimal substructure |
| Branch & bound | Backtracking + lower-bound pruning for NP-hard optimization |

#### Bit / math / strings / geometry

| Topic | Use |
|---|---|
| Bit manipulation | XOR pair finding, subset enumeration via masks, popcount, Kernighan |
| Number theory | GCD / LCM (Euclid), modular arithmetic, modular inverse, Fermat, modular exponentiation, **Möbius function & inversion**, **Tonelli-Shanks** (modular square root) |
| Primes | Sieve of Eratosthenes, linear sieve + SPF, factorization, Miller-Rabin, Euler's totient |
| Combinatorics | `C(n, k)`, Pascal's triangle, stars & bars, Catalan, inclusion-exclusion, **Lucas's theorem** (`C(n, k) mod p` for huge n) |
| String matching | KMP, Rabin-Karp, Z-algorithm, Aho-Corasick, Manacher, Suffix array + LCP, **Suffix automaton + BWT / FM-index** |
| Computational geometry | Cross product / orientation, convex hull (Andrew), segment intersection, shoelace area, sweepline / skyline, **Voronoi / Delaunay (Fortune's sweepline)** |
| Numerical / FFT | FFT (Cooley-Tukey), NTT (modular FFT), polynomial / big-int multiplication, convolution |
| Fractals | Mandelbrot / Julia escape-time iteration |

#### Game tree / search

| Topic | Use |
|---|---|
| Minimax + alpha-beta pruning | Two-player zero-sum games (chess, connect-4); alpha-beta + iterative deepening + transposition tables |
| Negamax | Minimax with single-function symmetry |
| **MCTS** (UCT / PUCT) | High-branching games (Go); selection / expansion / simulation / backprop; AlphaZero with neural priors |
| **Sprague-Grundy / Nim** | Impartial combinatorial games — Grundy number via mex; XOR across independent sub-games |
| A* | Single-agent shortest path with heuristic |
| Iterative deepening (IDDFS / IDA*) | Memory-bounded depth-first |
| **Simulated annealing** | Metaheuristic for hard optimization (TSP, VLSI); Metropolis criterion + cooling schedule |

#### Distributed / online / ML primitives

| Topic | Use |
|---|---|
| Consistent hashing | Distribute keys with minimal rebalance on resize; ring + virtual nodes |
| Paxos / Raft | Replicated log / state machine with majority quorum |
| 2-phase commit | Atomic transaction across participants (blocks on coordinator failure) |
| Vector / Lamport clocks | Logical time in distributed systems |
| Backpropagation + Adam | Train any differentiable model — chain rule + adaptive optimizer |
| Gradient boosting (XGBoost / LightGBM / CatBoost) | Tabular ML default; sequential trees on the loss gradient |
| Viterbi | Most-likely path in HMM via max-product DP |
| K-means (Lloyd's + k-means++) | Partition into K Voronoi clusters by Euclidean distance |
| Merkle tree | Tamper-evident commitment to a set (blockchain, Git, IPFS) |
| Count-min sketch / HyperLogLog / MinHash | Streaming frequency / cardinality / similarity |
| K-D tree | Low-dimensional NN / range queries (k ≤ 10) |
| Branch and bound | Exact NP-hard optimization with admissible lower bounds |

#### Common cross-topic mistakes

| Mistake | Fix |
|---|---|
| BFS for shortest path on weighted graph | Wrong — only correct for unit weights |
| Dijkstra with negative edge | Use Bellman-Ford |
| Recursion-DFS on huge graph | Stack overflow — use iterative DFS |
| Mark visited *after* popping in BFS | Double-enqueue — mark on push |
| `result.append(path)` instead of `path[:]` | Copy on append |
| String concat in a loop | O(n²) — use `''.join(...)` |
| Memoize on mutable state | Convert to tuple / frozenset first |
| 0/1 knapsack iterated forward | Allows reuse — iterate reverse |
| Off-by-one in DP base case | Index from 0 vs 1; draw the table |
| Hash map worst case ignored | Many collisions → O(n) per lookup |
| Forgetting sort is O(n log n) | "Just sort then scan" is not O(n) |

**Rule of thumb:**
- **Pick the data structure first**, then the technique, then the algorithm.
- **Constraint on the input determines the algorithm**: weight sign for graphs, sortedness for arrays, monotonicity for binary search on answer.
- **State the time AND space complexity** before writing code.
- For details on any topic above, search by its keyword — every topic has its own memo with schema + interview code.
