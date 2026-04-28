### Merkle Tree (hash tree, blockchain, Git, content addressing, proof of inclusion)

**When:** efficient verification of large data — Bitcoin / Ethereum block summaries, Git commits, IPFS, BitTorrent (rare), certificate transparency, deduplication, anti-tampering audit logs. The standard primitive for "prove this item is in this set without sending the whole set".

**Schema:**

| Concept | Detail |
|---|---|
| Leaves | `H(data_i)` — hash of each chunk / record |
| Internal nodes | `H(left_child ∥ right_child)` — concatenate children, hash again |
| Root | One hash that uniquely commits to all data |
| Proof of inclusion (Merkle proof) | `O(log n)` sibling hashes; verifier rebuilds the path to the root |
| Tampering | Changing any leaf → all hashes on its path change → root changes → detected |

**Visual:**

```
              root = H(H₁₂ ∥ H₃₄)
              /                 \
       H₁₂ = H(h₁ ∥ h₂)    H₃₄ = H(h₃ ∥ h₄)
        /         \           /         \
      h₁=H(d₁)  h₂=H(d₂)   h₃=H(d₃)  h₄=H(d₄)
```

#### Implementation

```python
import hashlib

def H(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()

def merkle_root(leaves):
    if not leaves: return H(b"")
    layer = [H(d) for d in leaves]
    while len(layer) > 1:
        if len(layer) % 2 == 1:
            layer.append(layer[-1])               # duplicate last (Bitcoin style)
        layer = [H(layer[i] + layer[i+1]) for i in range(0, len(layer), 2)]
    return layer[0]

def merkle_proof(leaves, index):
    """Returns siblings along the path from leaf[index] to root."""
    layer = [H(d) for d in leaves]
    proof = []
    while len(layer) > 1:
        if len(layer) % 2 == 1: layer.append(layer[-1])
        sibling_idx = index ^ 1
        proof.append((layer[sibling_idx], sibling_idx > index))    # (hash, "right sibling?")
        index >>= 1
        layer = [H(layer[i] + layer[i+1]) for i in range(0, len(layer), 2)]
    return proof

def verify(leaf_data, proof, root):
    cur = H(leaf_data)
    for sibling, is_right in proof:
        cur = H(cur + sibling) if is_right else H(sibling + cur)
    return cur == root
```

> **Verifier downloads only `O(log n) hashes`** to prove a single leaf is in a set of `n`. For 1M leaves: ~20 hashes (640 bytes with SHA-256).

#### Properties

| Property | Detail |
|---|---|
| **Integrity** | Single root commits to all data; tamper-evident |
| **Compact proofs** | O(log n) per inclusion proof |
| **Incremental updates** | Adding a leaf: recompute O(log n) ancestors |
| **Streaming-friendly** | Can compute root from a stream of leaves (using a stack) |
| **Append-only friendly** | "Consistency proof" between two sequential roots: O(log n) |

#### Variants

| Variant | What it adds |
|---|---|
| **Binary Merkle tree** | Default (Bitcoin, Git, RFC 6962) |
| **Patricia Merkle trie** | Combine with radix trie; key-value commitment (Ethereum state) |
| **Merkle Mountain Range (MMR)** | Append-only forest; better append/proofs |
| **Merkle DAG** | General DAG with hash links (Git, IPFS) |
| **Verkle tree** | Vector commitment instead of hash; smaller proofs (~32 bytes total) |
| **Sparse Merkle tree** | Indexed by hash of key; useful for "value-at-key" proofs |
| **History tree** | Versioned, tamper-evident logs |

#### Use cases

| System | Use of Merkle tree |
|---|---|
| **Bitcoin** | Each block has Merkle root of its transactions |
| **Ethereum** | State, transaction, and receipt tries are Patricia-Merkle |
| **Git** | Commits hash-link to trees; trees hash-link to blobs / subtrees |
| **IPFS / Bittorrent v2** | Content-addressed Merkle DAG |
| **Certificate Transparency** | Append-only Merkle log of all certificates |
| **Filesystem checksums (ZFS, btrfs)** | Detect silent corruption via tree of block hashes |
| **Database integrity (TigerBeetle, etc.)** | Auditable transaction log |
| **DynamoDB / Cassandra anti-entropy** | Compare Merkle trees of partitions to find divergent ranges |
| **Zero-knowledge proofs** | Commit to private data via Merkle root |

#### Inclusion proof / consistency proof

| Proof type | What it shows | Size |
|---|---|---|
| **Inclusion** | Leaf `x` is in tree with root `R` | O(log n) hashes |
| **Consistency** | Tree at root `R'` is a strict append-only extension of `R` | O(log n) hashes |
| **Non-inclusion** (sparse Merkle) | Key `k` is NOT in tree | O(log n) hashes |

#### Bitcoin's Merkle tree quirk

If a layer has an odd number of nodes, **duplicate the last** before pairing. This causes a known weakness (CVE-2012-2459) — be careful when verifying proofs.

#### Pitfalls

| Mistake | Fix |
|---|---|
| Using `H(a ∥ b)` for both leaves and internals interchangeably | Use **domain separation**: `H(0x00 ∥ leaf)` for leaves, `H(0x01 ∥ left ∥ right)` for internals (RFC 6962) |
| Not duplicating last node on odd levels (or duplicating wrong) | Match the convention you specify |
| Treating Merkle as a balanced BST | It's a **binary tree of hashes**; not for ordered queries |
| Bitcoin malleability (CVE-2012-2459) | Don't allow duplicate transactions; check size mismatch |
| Using a weak hash (MD5 / SHA-1) | Use SHA-256 / BLAKE2 / Keccak |
| Confusing Merkle DAG with Merkle tree | DAG = nodes can have multiple parents; tree = strictly parent ↔ children |
| Implementing without test vectors | Test against published vectors (RFC 6962 has them) |

#### Complexity

| Op | Cost |
|---|---|
| Build root | O(n) |
| Inclusion proof | O(log n) |
| Verify proof | O(log n) hashes |
| Update single leaf | O(log n) |
| Memory (full tree) | O(n) |
| Memory (root only) | O(1) |

**Rule of thumb:** **Merkle root commits to a set; proof of inclusion is O(log n) hashes**. Use **domain separation** between leaf and internal hashes (RFC 6962). Default hash: **SHA-256**. For "key-value" commitments, use **Patricia Merkle trie** (Ethereum) or **sparse Merkle tree**. The pattern underpins blockchains, Git, IPFS, certificate transparency, and any system that needs **tamper-evident logs**.
