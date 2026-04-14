### Consensus and Leader Election

**The consensus problem:**
- Multiple nodes must agree on a single value
- Must work even if some nodes fail
- Foundation of distributed databases, leader election, configuration management

**Raft (most approachable consensus algorithm):**
- Designed for understandability (alternative to Paxos)
- Used in: etcd (K8s), Consul, CockroachDB

**Raft key concepts:**
- **Leader** - handles all client requests, replicates to followers
- **Follower** - passive, replicates leader's log
- **Candidate** - follower that hasn't heard from leader, starts election

**Raft flow:**
1. Leader receives client write
2. Leader appends to its log, sends to followers
3. Majority acknowledge -> leader commits entry
4. Leader notifies client of success

**Leader election:**
1. Follower times out (no heartbeat from leader)
2. Becomes candidate, increments term, votes for itself
3. Requests votes from other nodes
4. Wins if receives majority of votes
5. Becomes leader, sends heartbeats to maintain authority

**Paxos:**
- Original consensus algorithm (Lamport, 1989)
- Correct but notoriously difficult to understand and implement
- Multi-Paxos: optimized for sequences of decisions
- Used in: Google Spanner, Chubby

**ZooKeeper (coordination service):**
- Centralized service for distributed coordination
- Provides: leader election, distributed locks, configuration management, service discovery
- Based on ZAB (ZooKeeper Atomic Broadcast) protocol
- Used by: Kafka (older versions), Hadoop, HBase

**etcd:**
- Distributed key-value store using Raft
- Kubernetes stores all cluster state in etcd
- Provides: leader election, distributed locks, watch for changes

**Split-brain problem:**
- Network partition causes two groups, each elects its own leader
- Both groups accept writes -> data divergence
- Prevention: require majority quorum (can't have two majorities)
- Odd number of nodes: 3, 5, 7 (avoids tie in votes)

**Quorum:**
- Minimum nodes that must agree for an operation to succeed
- Read quorum (R) + Write quorum (W) > Total nodes (N) for consistency
- Common: N=3, W=2, R=2 (majority reads and writes)

**Rule of thumb:** Use Raft/etcd for leader election and consensus in your systems. Odd number of nodes (3 or 5). Majority quorum prevents split-brain. Don't implement consensus yourself - use etcd, ZooKeeper, or Consul.
