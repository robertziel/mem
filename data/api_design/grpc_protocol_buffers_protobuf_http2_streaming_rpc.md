### gRPC and Protocol Buffers

**What gRPC is:**
- High-performance RPC framework (Google, open-source)
- Uses HTTP/2 for transport (multiplexing, streaming, header compression)
- Protocol Buffers (protobuf) for serialization (binary, compact, fast)
- Strong typing with code generation for all major languages

**When to use gRPC vs REST:**
| Feature | gRPC | REST |
|---------|------|------|
| Format | Binary (protobuf) | Text (JSON) |
| Performance | Faster (smaller payload, HTTP/2) | Slower (verbose JSON) |
| Typing | Strongly typed (schema) | Loosely typed |
| Streaming | Bidirectional | SSE or WebSocket (separate) |
| Browser support | Limited (needs grpc-web proxy) | Native |
| Tooling | Code generation | OpenAPI/Swagger |
| Best for | Internal microservices | Public APIs, browser clients |

**Protobuf definition:**
```protobuf
syntax = "proto3";
package user;

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);          // server streaming
  rpc CreateUser (User) returns (User);
  rpc Chat (stream ChatMessage) returns (stream ChatMessage);      // bidirectional
}

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
  repeated string roles = 4;
  google.protobuf.Timestamp created_at = 5;
}

message GetUserRequest {
  int64 id = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}
```

**gRPC communication patterns:**
1. **Unary** - single request, single response (like REST)
2. **Server streaming** - single request, stream of responses (real-time updates)
3. **Client streaming** - stream of requests, single response (file upload)
4. **Bidirectional streaming** - both stream (chat, live updates)

**Code generation:**
```bash
protoc --go_out=. --go-grpc_out=. user.proto        # Go
protoc --python_out=. --grpc_python_out=. user.proto  # Python
protoc --ruby_out=. --grpc_ruby_out=. user.proto      # Ruby
```

**gRPC features:**
- **Deadlines/timeouts** - request-level timeout propagated across services
- **Metadata** - key-value headers (like HTTP headers, for auth tokens)
- **Interceptors** - middleware for logging, auth, metrics
- **Load balancing** - client-side or proxy-based (Envoy)
- **Health checking** - standard health check protocol

**gRPC error codes (not HTTP status codes):**
- `OK`, `CANCELLED`, `INVALID_ARGUMENT`, `NOT_FOUND`, `ALREADY_EXISTS`
- `PERMISSION_DENIED`, `UNAUTHENTICATED`, `RESOURCE_EXHAUSTED`
- `INTERNAL`, `UNAVAILABLE`, `DEADLINE_EXCEEDED`

**Rule of thumb:** Use gRPC for internal service-to-service communication (faster, typed, streaming). Use REST for public/external APIs (browser-friendly, universal). Protobuf schemas are your contract - version them carefully.
