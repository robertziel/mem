### Complexity Analysis (Big O)

**What Big O measures:**
- Describes how runtime/space grows as input size N grows
- Drops constants and lower-order terms: O(2n + 5) = O(n)
- Worst case unless stated otherwise

**Common complexities (fast to slow):**
| Big O | Name | Example |
|-------|------|---------|
| O(1) | Constant | Hash map lookup, array access |
| O(log n) | Logarithmic | Binary search, balanced BST |
| O(n) | Linear | Array scan, single loop |
| O(n log n) | Linearithmic | Merge sort, efficient sorting |
| O(n^2) | Quadratic | Nested loops, bubble sort |
| O(2^n) | Exponential | Subsets, recursive fibonacci |
| O(n!) | Factorial | Permutations, brute force TSP |

**Practical scale (for ~1 second runtime):**
| Complexity | Max N |
|-----------|-------|
| O(n!) | ~12 |
| O(2^n) | ~25 |
| O(n^3) | ~500 |
| O(n^2) | ~10,000 |
| O(n log n) | ~10,000,000 |
| O(n) | ~100,000,000 |
| O(log n) | ~10^18 |

**Amortized analysis:**
- Average cost over a sequence of operations
- Dynamic array append: individual resize is O(n), but amortized O(1) per append
- Hash map insert: occasional resize is O(n), amortized O(1)

**Space complexity:**
- Memory used by the algorithm (excluding input)
- Recursive call stack counts: DFS on tree = O(h) space (height of tree)
- Creating a copy of input = O(n) space
- In-place algorithms = O(1) extra space

**Common analysis patterns:**
- Single loop over N: O(n)
- Nested loop: O(n^2)
- Loop with halving (binary search): O(log n)
- Sorting + linear scan: O(n log n)
- Recursive with two branches (fibonacci): O(2^n)
- Recursive with one branch halving: O(log n)
- N items, processing each in O(log n): O(n log n)

**How to analyze:**
1. Count the dominant operations (comparisons, assignments)
2. Express as function of input size
3. Drop constants and lower-order terms
4. Identify: is it iterating? nesting? halving? branching?

**Common mistakes:**
- Forgetting string operations are O(n): string concatenation in loop = O(n^2)
- Forgetting sort is O(n log n): "I just sort then scan" = O(n log n), not O(n)
- Ignoring hash map collisions: worst case O(n) per lookup
- Recursive space: each recursive call uses stack space

**Rule of thumb:** If N ≤ 10^4, O(n^2) is fine. If N ≤ 10^7, need O(n log n) or O(n). If N ≤ 10^9, need O(n) or O(log n). Always state both time and space complexity.
