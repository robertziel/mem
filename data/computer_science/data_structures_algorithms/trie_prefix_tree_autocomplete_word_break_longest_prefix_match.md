### Trie (prefix tree, autocomplete, word break, longest prefix match)

**When:** prefix queries — autocomplete, spell check, word break, IP routing, dictionary lookup with wildcard. **Beats hash map only when the question is about prefixes.**

**Schema:**

| Node holds | Why |
|---|---|
| `children: dict[char] → Node` | One child per next character |
| `is_end: bool` | Marks the end of an inserted word |
| `count: int` (optional) | Number of words sharing this prefix |

```
insert("car"), insert("cat"), insert("dog")

         root
        /    \
       c      d
       |      |
       a      o
      / \     |
     r   t    g
     *   *    *      (* = is_end)
```

**Implementation:**

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.word = None        # set on terminal nodes for Word Search II

class Trie:
    def __init__(self): self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):
        node = self._walk(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._walk(prefix) is not None

    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node.children: return None
            node = node.children[ch]
        return node
```

**Operations:**

| Op | Time | Space |
|---|---|---|
| Insert word | O(L) | O(L · σ) worst case (σ = alphabet) |
| Search word | O(L) | — |
| Prefix lookup | O(L) | — |
| Delete word | O(L) | (Optionally prune empty branches) |

L = word length.

**Autocomplete (DFS from prefix node):**

```python
def autocomplete(trie, prefix, k=10):
    node = trie._walk(prefix)
    if not node: return []
    out = []
    def dfs(n, path):
        if len(out) >= k: return
        if n.is_end: out.append(prefix + ''.join(path))
        for ch, child in n.children.items():
            path.append(ch); dfs(child, path); path.pop()
    dfs(node, [])
    return out
```

**Word search II (find all dictionary words in a grid — trie + DFS):**

```python
def find_words(board, words):
    root = TrieNode()
    for w in words:                       # build trie of dictionary
        n = root
        for c in w:
            n = n.children.setdefault(c, TrieNode())
        n.is_end = True
        n.word = w                        # store the word at terminal

    res = []
    rows, cols = len(board), len(board[0])
    def dfs(r, c, node):
        ch = board[r][c]
        if ch not in node.children: return
        nxt = node.children[ch]
        if nxt.is_end:
            res.append(nxt.word); nxt.is_end = False  # de-dup
        board[r][c] = '#'
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):
            nr, nc = r+dr, c+dc
            if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':
                dfs(nr, nc, nxt)
        board[r][c] = ch
    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)
    return res
```

**Patterns map:**

| Problem | Trie trick |
|---|---|
| Autocomplete | Walk to prefix node, DFS to collect words |
| Word search II | Trie of dictionary, DFS in grid |
| Replace words (root → word) | Insert roots, replace each word with shortest matching prefix |
| Longest common prefix | Walk while exactly one child and not end |
| Stream of characters with words | Reverse-trie + check from latest character |
| Maximum XOR pair | Bit-trie (32 levels), greedy opposite bit |
| IP routing (longest prefix match) | Bit-trie on IP bits |
| Word break | Trie + DP on string positions |

**Trie vs hash map:**

| Concern | Trie | Hash map |
|---|---|---|
| Exact lookup | O(L) | O(L) for hashing + O(1) avg |
| Prefix lookup | **O(L)** | O(n · L) — must scan all keys |
| Memory | Higher (one node per char) | Lower for sparse keys |
| Sorted iteration | DFS order | Needs separate sort |

**Pitfalls:**

| Mistake | Fix |
|---|---|
| Forgetting `is_end` | "ca" matches "car" wrongly without end marker |
| Using `dict` keyed by full strings | That's a hash set, not a trie — no prefix advantage |
| Bloated nodes | Use `__slots__` and array-of-26 if alphabet is fixed |

**Rule of thumb:** trie is the right answer **when prefixes are queried**. For exact-match-only or "have I seen X" questions, **a hash set is simpler and lighter**.
