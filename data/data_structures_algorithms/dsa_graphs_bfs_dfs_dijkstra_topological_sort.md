### Graphs

**Representations:**

**Adjacency list (most common):**
```python
graph = defaultdict(list)
graph[0].append(1)  # edge 0 -> 1
graph[0].append(2)  # edge 0 -> 2
```
- Space: O(V + E)
- Check edge exists: O(degree)
- Best for sparse graphs (most real-world graphs)

**Adjacency matrix:**
```python
matrix[i][j] = 1  # edge i -> j
```
- Space: O(V^2)
- Check edge exists: O(1)
- Best for dense graphs

**BFS (Breadth-First Search):**
```python
def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
```
- Use for: shortest path (unweighted), level-order, connected components
- Time: O(V + E)

**DFS (Depth-First Search):**
```python
def dfs(graph, node, visited):
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
```
- Use for: cycle detection, topological sort, connected components, path finding
- Time: O(V + E)

**Topological Sort (DAG only):**
- Linear ordering where for every edge u->v, u comes before v
- Use for: build systems, task scheduling, course prerequisites
- Kahn's algorithm (BFS-based):
```python
indegree = {node: 0 for node in graph}
for node in graph:
    for neighbor in graph[node]:
        indegree[neighbor] += 1
queue = deque([n for n in indegree if indegree[n] == 0])
order = []
while queue:
    node = queue.popleft()
    order.append(node)
    for neighbor in graph[node]:
        indegree[neighbor] -= 1
        if indegree[neighbor] == 0:
            queue.append(neighbor)
# if len(order) != len(graph): cycle exists
```

**Shortest path algorithms:**
| Algorithm | Graph type | Time | Use case |
|-----------|-----------|------|----------|
| BFS | Unweighted | O(V+E) | Shortest path in unweighted |
| Dijkstra | Weighted (no negative) | O((V+E)log V) | Single source shortest path |
| Bellman-Ford | Weighted (with negative) | O(VE) | Negative edges, detect negative cycles |
| Floyd-Warshall | All pairs | O(V^3) | All-pairs shortest path (small graphs) |

**Dijkstra:**
```python
import heapq
def dijkstra(graph, start):
    dist = {start: 0}
    heap = [(0, start)]
    while heap:
        d, node = heapq.heappop(heap)
        if d > dist.get(node, float('inf')): continue
        for neighbor, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist.get(neighbor, float('inf')):
                dist[neighbor] = new_dist
                heapq.heappush(heap, (new_dist, neighbor))
    return dist
```

**Union-Find (Disjoint Set):**
- Track connected components, detect cycles in undirected graphs
- Operations: find(x), union(x, y) - nearly O(1) with path compression + rank

**Common graph problems:**
- Number of islands (grid BFS/DFS)
- Clone graph, course schedule (topological sort)
- Detect cycle (DFS coloring or Union-Find)
- Shortest path, network delay time (Dijkstra)

**Rule of thumb:** BFS for shortest path in unweighted graphs. DFS for cycle detection and topological sort. Dijkstra for weighted shortest path. Adjacency list unless the graph is dense.
