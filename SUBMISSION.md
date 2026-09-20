# Product Engineering Challenge Submission

## Candidate

* **Name:** Shubham Pawar
* **Email:** pawarshubham5959@gmail.com
* **GitHub:** https://github.com/ShubhamPawar-19/
* **Selected problem:** Problem 4 — Trustworthy Long-Term Memory
* **Demo video:** 

## Run the project

### Prerequisites

* Node.js 20+
* npm

No database, API key, model provider, or external service is required.

### Install dependencies

```bash
npm install
```

### Run the interactive demo

```bash
npm run dev
```

The demo demonstrates:

1. Storing a memory with source provenance.
2. Retrieving the current relevant memory.
3. Explicitly correcting `Pune → Mumbai`.
4. Inspecting the supersession relationship.
5. Verifying that the outdated memory is no longer returned.
6. Deleting the current memory and verifying that retrieval returns zero results.

### Run the deterministic verification benchmark

```bash
npm run benchmark
```

The benchmark uses only version-controlled local fixtures and does not require any paid or external service.

## Run the tests

Run the automated tests:

```bash
npm test
```

Run TypeScript type checking:

```bash
npm run typecheck
```

Run the deterministic verification benchmark:

```bash
npm run benchmark
```

## Acceptance scenarios and verification

### AC1 — Store with provenance

A memory has a stable ID, structured subject/predicate/value, source message ID, creation/update timestamps, and lifecycle state.

The source message can be inspected through the repository and `MemoryEngine`.

**Status: Complete**

### AC2 — Relevant retrieval

The retrieval engine considers only active memories, applies deterministic predicate/value matching, returns a bounded number of results, and exposes the score and matched fields used for selection.

The default retrieval limit is five results.

**Status: Complete**

### AC3 — Explicit correction

An explicit correction can reference the active memory it replaces.

For example:

```text
Pune
  ↓ superseded by
Mumbai
```

The original Pune memory remains stored for history, but its lifecycle becomes `superseded`. Mumbai becomes `active` and is the only current memory returned for the location query.

**Status: Complete**

### AC4 — Uncertain contradiction

A conflicting candidate without an explicit replacement target does not automatically destroy or supersede an existing memory.

The conservative policy is to preserve both memories and require explicit replacement semantics before supersession.

**Status: Complete**

### AC5 — Deletion

Deletion is implemented as a soft delete. The memory remains available for historical inspection, but its lifecycle changes to `deleted` and it is excluded from current retrieval.

**Status: Complete**

### AC6 — Stable evaluation

The benchmark uses deterministic local fixtures and deterministic retrieval rules.

**Status: Complete**

### Verification benchmark

Run:

```bash
npm run benchmark
```

Observed result:

```text
Memories: 38
Queries:  20

Retrieval queries: 20/20
Total failures: 0
Overall: PASS
```

The benchmark also performs lifecycle and ambiguity checks:

```text
PASS lifecycle - Original Pune memory is superseded
PASS lifecycle - Mumbai memory supersedes original Pune
PASS lifecycle - Original Pune points to Mumbai
PASS lifecycle - Current Pune memory supersedes Mumbai
PASS lifecycle - Mumbai is superseded
PASS lifecycle - Current Pune memory remains active
PASS ambiguity - Ambiguous company conflict preserves original
PASS ambiguity - Ambiguous food conflict preserves original
```

The benchmark contains 30 baseline memories, six explicit correction operations, and two ambiguous candidates, resulting in 38 materialized memory records while preserving superseded history.

### Automated test verification

Observed result:

```text
10/10 tests passing
```

Type checking also completes successfully:

```text
npm run typecheck
```

### Failure/recovery scenario

The primary recovery scenario is explicit correction:

```text
I live in Pune.
        ↓
I moved to Mumbai.
```

The original memory is not deleted. It becomes `superseded`, while the Mumbai memory becomes `active`.

A subsequent location retrieval returns Mumbai and does not return Pune as current context.

A reviewer can reproduce this with:

```bash
npm run dev
```

The CLI demo prints the memory state before and after correction and then demonstrates deletion from retrieval.

## Architecture and data flow

The implementation separates extraction/candidate creation, storage, reconciliation, and retrieval.

```text
Source Message
      │
      ▼
Structured Memory Candidate
      │
      ▼
   MemoryEngine
      │
      ├──────────────► Memory Repository
      │                    │
      │                    └── Memory lifecycle/history
      │
      ├──────────────► Reconciliation
      │                    │
      │                    └── active → superseded
      │
      └──────────────► Retrieval
                           │
                           ├── active memories only
                           ├── deterministic scoring
                           ├── bounded results
                           └── selection evidence
```

### Main components

**Domain**

Defines the `Memory` and `SourceMessage` contracts and memory creation rules.

**Storage**

`MemoryRepository` defines the persistence interface. The submitted implementation uses an in-memory repository so the exercise remains deterministic and requires no external infrastructure.

**Reconciliation**

Handles explicit supersession and conservative conflict decisions.

An explicit replacement links the new memory to the memory it supersedes and updates the old memory's lifecycle.

**Retrieval**

Scores active memories using deterministic predicate aliases and value matching. Results contain:

* memory
* score
* matched fields
* human-readable selection reason

Results are sorted deterministically and bounded by the requested limit.

**Benchmark**

Loads version-controlled fixtures, applies corrections and ambiguous candidates, executes fixed queries, and verifies expected inclusions/exclusions and lifecycle invariants.

## Technology choices

### TypeScript + Node.js

TypeScript provides strict contracts for the memory lifecycle and repository interfaces while Node.js keeps the prototype lightweight.

### Vitest

Vitest provides fast deterministic tests with minimal setup.

### In-memory storage

An in-memory repository was intentionally chosen instead of PostgreSQL or a vector database.

The challenge evaluates memory correctness, provenance, lifecycle, explainability, and deterministic retrieval rather than persistence infrastructure. Avoiding external infrastructure also makes the benchmark reproducible with a single command.

### Deterministic rule-based retrieval

I deliberately did not introduce embeddings or an LLM.

The retrieval strategy uses normalized predicate aliases and value matching with observable scoring. This makes every benchmark result deterministic and directly testable.

A vector or model-based approach could improve semantic recall, but it would introduce additional complexity and make the core lifecycle behaviour harder to isolate.

## Important decisions

### 1. Explicit replacement is required for automatic supersession

A conflicting value does not automatically replace an existing memory.

When an explicit `currentMemoryId` is supplied, the engine treats the operation as a correction and creates a supersession link.

Without that explicit replacement relationship, conflicting candidates are preserved.

This prevents an uncertain observation from silently destroying historical information.

### 2. Soft deletion

Deletion changes the memory lifecycle to `deleted` rather than physically removing the record.

This preserves provenance and auditability while making the memory unavailable to normal current-context retrieval.

### 3. Retrieval only operates on active memories

Superseded and deleted memories remain inspectable, but retrieval starts from the active-memory set.

This makes the distinction between historical information and current conversational context explicit.

## Assumptions and limitations

* Memory extraction from natural-language conversation is intentionally out of scope. The engine accepts structured memory candidates.
* Retrieval is deterministic lexical/rule-based rather than semantic embedding retrieval.
* Predicate aliases are intentionally limited and fixture-driven.
* Storage is in-memory and therefore not persistent across process restarts.
* The prototype is single-user.
* There is no polished memory-management UI.
* No model or external API is required.
* Ambiguous conflicts are preserved rather than automatically resolved.
* Production handling of highly sensitive memories would require additional policy and access controls.

These limitations are intentional to keep the implementation focused on the problem's required provenance, lifecycle, retrieval, and deterministic verification behaviour.

## Production and scale

The submitted implementation is deliberately a small in-memory prototype.

For production, I would change the persistence and retrieval layers first while keeping the domain and lifecycle contracts stable.

### Persistence

Replace the in-memory repository with a transactional database implementation.

Memory lifecycle transitions such as:

```text
active → superseded
active → deleted
```

should be atomic so concurrent updates cannot produce multiple inconsistent current states.

### Retrieval at larger scale

For larger memory collections, I would introduce indexed retrieval and potentially embeddings/hybrid search.

I would keep lifecycle filtering as a hard constraint:

```text
deleted/superseded → never current retrieval
active → eligible for retrieval
```

Semantic similarity should improve candidate recall, not override lifecycle state.

### Concurrency and auditability

Production would also need:

* optimistic/concurrent update handling
* stronger audit logs
* user-level isolation
* retention policies
* access controls
* encryption for sensitive data
* monitoring of retrieval quality
* evaluation fixtures for regression testing

The submitted prototype does not implement these production concerns.

## AI usage

AI-assisted development tools were used during implementation.

They were used primarily for:

* discussing architecture and decomposition
* reviewing implementation approaches
* identifying edge cases
* improving test coverage
* reviewing benchmark and submission structure

The final implementation was manually reviewed and verified by running the automated test suite, TypeScript type checking, deterministic benchmark, and CLI demonstration.

No external model is required at runtime, and no AI-generated result is treated as the source of truth for benchmark correctness.

## Credibility note

### NexFlow

NexFlow is an AI workflow automation SaaS I built to explore product-grade workflow orchestration and AI integrations.

**Problem solved**

Businesses often need to connect forms, communication channels, AI models, and business actions without manually moving information between systems. NexFlow provides a workflow-based automation layer for connecting these operations.

**My contribution**

I designed and implemented the application architecture and core workflow execution system, including:

* Next.js/TypeScript application
* React Flow-based workflow builder
* Prisma/PostgreSQL data layer
* workflow execution and orchestration
* Inngest-based background execution
* AI provider integrations
* Gmail and WhatsApp integrations
* webhook and trigger handling
* execution state and realtime feedback
* workflow nodes and their executor structure

**Engineering complexity**

The system coordinates multiple trigger and action types with asynchronous execution, persisted workflow state, external API integrations, and failure-sensitive execution paths.

One of the more important design decisions was separating trigger nodes from execution/action nodes and giving executors a consistent execution context. This made new integrations easier to add without redesigning the workflow engine.

**Evidence**

Repository/project:

https://github.com/ShubhamPawar-19

NexFlow demo:

https://nexflow-swart.vercel.app/
