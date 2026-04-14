### Testing Levels (Low to High)

1. **Unit test** -> One function/method in isolation.
2. **Functional test** -> One component boundary (for Rails, typically controller behavior).
3. **Integration test** -> Multiple internal components working together.
4. **Contract test** -> API expectations between services.
5. **End-to-end test** -> Full system flow from user entry point to completion.

### Rails Testing Reminder

- Controller tests are functional tests.
- Touching the database alone does not make a test "integration."
- Integration scope comes from crossing meaningful internal boundaries, not just from DB access.

**Rule of thumb**: Classify tests by scope and boundaries, not by whether persistence is involved.
