### LLD: LRU Cache Implementation

**Requirements:**
- Fixed capacity cache with O(1) get and put
- Evict least recently used item when full
- Thread-safe (optional extension)

**Data structure: HashMap + Doubly Linked List**
```
HashMap: key -> node (O(1) lookup)
Doubly Linked List: most recent at head, least recent at tail (O(1) move/remove)

  HEAD <-> [A] <-> [B] <-> [C] <-> TAIL
  most recent                least recent
```

**Implementation:**
```ruby
class LRUCache
  def initialize(capacity)
    @capacity = capacity
    @map = {}
    @head = Node.new(nil, nil)  # dummy head
    @tail = Node.new(nil, nil)  # dummy tail
    @head.next = @tail
    @tail.prev = @head
  end

  def get(key)
    node = @map[key]
    return -1 unless node
    move_to_head(node)
    node.value
  end

  def put(key, value)
    if @map.key?(key)
      node = @map[key]
      node.value = value
      move_to_head(node)
    else
      evict_lru if @map.size >= @capacity
      node = Node.new(key, value)
      @map[key] = node
      add_to_head(node)
    end
  end

  private

  def add_to_head(node)
    node.prev = @head
    node.next = @head.next
    @head.next.prev = node
    @head.next = node
  end

  def remove(node)
    node.prev.next = node.next
    node.next.prev = node.prev
  end

  def move_to_head(node)
    remove(node)
    add_to_head(node)
  end

  def evict_lru
    lru = @tail.prev
    remove(lru)
    @map.delete(lru.key)
  end
end

class Node
  attr_accessor :key, :value, :prev, :next
  def initialize(key, value)
    @key = key
    @value = value
  end
end
```

**Complexity:**
| Operation | Time | Space |
|-----------|------|-------|
| get | O(1) | - |
| put | O(1) | - |
| Overall | - | O(capacity) |

**Thread-safe extension:**
```ruby
def get(key)
  @mutex.synchronize do
    # ... same logic
  end
end
```
Or use read-write lock: multiple concurrent reads, exclusive writes.

**Why HashMap + Doubly Linked List:**
- HashMap: O(1) key lookup
- Doubly Linked List: O(1) move to head, O(1) remove from tail
- Singly linked list won't work: can't remove in O(1) without prev pointer

**Variants asked in interviews:**
- **LFU Cache** — evict least frequently used (HashMap + min-heap or frequency buckets)
- **TTL Cache** — evict expired entries (add expiry timestamp, lazy cleanup)
- **Distributed LRU** — consistent hashing to shard across nodes

**Common follow-ups:**
- "How would you make this distributed?" → Consistent hashing, each node has its own LRU
- "What about cache stampede?" → Locking on key, stale-while-revalidate
- "How to add TTL?" → Store expiry per entry, check on get, background cleanup thread

**Rule of thumb:** LRU Cache = HashMap + Doubly Linked List. Both are needed for O(1). Use dummy head/tail nodes to simplify edge cases. This is one of the most common LLD questions — practice until you can code it from memory.
