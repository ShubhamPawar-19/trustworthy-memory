# Product Engineering Challenge Submission

## Candidate

* **Name:** Shubham Pawar
* **Email:** [pawarshubham5959@gmail.com](mailto:pawarshubham5959@gmail.com)
* **GitHub:** https://github.com/ShubhamPawar-19/trustworthy-memory
* **Selected problem:** Problem 4 — Trustworthy Long-Term Memory
* **Demo video:** (https://youtu.be/60Lz5Khxt7s)

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

The CLI demo demonstrates:

1. Storing a memory with source provenance.
2. Retrieving the current relevant memory.
3. Explicitly correcting `Pune → Mumbai`.
4. Inspecting the supersession relationship.
5. Verifying that the superseded Pune memory is excluded from current retrieval.
6. Deleting the current memory and verifying that retrieval returns zero results.

### Run the deterministic verification benchmark

```bash
npm run benchmark
```

The benchmark uses only version-controlled local fixtures and deterministic retrieval rules. It does not require any paid or external service.

## Run the tests

Run the automated test suite:

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

Each memory has:

* a stable ID
* structured `subject`, `predicate`, and `value`
* source message ID
* creation and update timestamps
* lifecycle status
* supersession links

Source messages can be inspected independently from the memory record.

**Status: Complete**

### AC2 — Relevant retrieval

Retrieval considers only memories with `active` lifecycle status.

The deterministic retrieval engine:

* matches normalized predicate aliases
* considers value matches
* produces an observable score
* records matched fields
* returns a human-readable selection reason
* sorts results deterministically
* applies a bounded result limit

The default retrieval limit is five results.

**Status: Complete**

### AC3 — Explicit correction

An explicit correction references the active memory it replaces.

Example:

```text
Pune
  ↓ superseded by
Mumbai
```

The original Pune memory remains stored for history, but its lifecycle becomes `superseded`. The Mumbai memory becomes `active` and is returned as the current location.

The implementation also preserves the reverse supersession relationship:

```text
Pune.supersededById = Mumbai.id
Mumbai.supersedesId = Pune.id
```

**Status: Complete**

### AC4 — Uncertain contradiction

A conflicting candidate without an explicit replacement target does not automatically supersede the existing memory.

The conservative policy is to preserve both memories and require explicit replacement semantics before changing lifecycle state.

This is demonstrated by the ambiguous company and food fixtures.

**Status: Complete**

### AC5 — Deletion

Deletion is implemented as a soft delete.

The memory remains available for historical inspection, but its lifecycle changes to `deleted` and it is excluded from current retrieval.

**Status: Complete**

### AC6 — Stable evaluation

The benchmark uses:

* version-controlled JSON fixtures
* deterministic reconciliation behaviour
* deterministic retrieval scoring
* fixed expected inclusions and exclusions
* deterministic lifecycle checks

The same command can be rerun without external dependencies.

**Status: Complete**

### Verification benchmark

Run:

```bash
npm run benchmark
```

Observed result:

```text
Trustworthy Memory Benchmark
============================
Memories: 38
Queries:  20

Retrieval queries: 20/20
Total failures: 0
Overall: PASS
```

The benchmark contains 30 baseline memories, six correction operations, and two ambiguous candidates, resulting in 38 materialized memory records.

It also verifies the Pune → Mumbai → Pune correction chain and the two ambiguous contradiction cases:

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

### Automated test verification

Observed result:

```text
10/10 tests passing
```

Type checking also completes successfully:

```bash
npm run typecheck
```

### Failure/recovery scenario

The primary recovery scenario is explicit correction:

```text
I live in Pune.

        ↓

I moved to Mumbai.
```

The original Pune memory is not deleted. It becomes `superseded`, while the Mumbai memory becomes `active`.

A subsequent location retrieval returns Mumbai and excludes Pune from current context.

The reviewer can reproduce the scenario with:

```bash
npm run dev
```

The CLI prints the memory state before and after correction and then demonstrates deletion from retrieval.

## Architecture and data flow

The implementation deliberately separates structured memory candidates, storage, reconciliation, and retrieval.

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

When an explicit replacement is provided, the new memory links to the memory it supersedes and the old memory transitions to `superseded`.

**Retrieval**

Scores active memories using deterministic predicate aliases and value matching.

Each result exposes:

* memory
* score
* matched fields
* human-readable selection reason

Results are deterministically sorted and bounded by the requested limit.

**Benchmark**

Loads version-controlled fixtures, applies corrections and ambiguous candidates, executes fixed retrieval queries, and verifies expected inclusions, exclusions, and lifecycle invariants.

## Technology choices

### TypeScript + Node.js

TypeScript provides strict contracts for the memory lifecycle, repository interface, and reconciliation operations while Node.js keeps the prototype lightweight.

### Vitest

Vitest provides a fast deterministic test environment with minimal setup.

### In-memory storage

An in-memory repository was intentionally chosen instead of PostgreSQL or a vector database.

The challenge evaluates provenance, lifecycle correctness, reconciliation, explainable retrieval, and deterministic verification rather than persistence infrastructure. Avoiding external infrastructure makes the benchmark reproducible with a single command.

### Deterministic rule-based retrieval

I deliberately did not introduce embeddings or an LLM.

Retrieval uses normalized predicate aliases and value matching with observable scoring.

This makes benchmark results deterministic and makes it possible to directly inspect why a memory was selected.

A vector or model-based approach could improve semantic recall, but it would introduce additional complexity and make the core lifecycle behaviour harder to isolate and verify.

## Important decisions

### 1. Explicit replacement is required for automatic supersession

A conflicting value does not automatically replace an existing memory.

When an explicit `currentMemoryId` is supplied, the engine treats the operation as a correction and creates a supersession link.

Without that explicit replacement relationship, conflicting candidates are preserved.

This prevents uncertain observations from silently destroying historical information.

### 2. Soft deletion

Deletion changes the memory lifecycle to `deleted` rather than physically removing the record.

This preserves provenance and auditability while making the memory unavailable to normal current-context retrieval.

### 3. Lifecycle filtering is enforced before retrieval scoring

Superseded and deleted memories remain inspectable, but retrieval starts from active memories only.

This makes lifecycle state a hard eligibility constraint rather than merely another retrieval signal.

## Assumptions and limitations

* Memory extraction from natural-language conversation is intentionally out of scope. The engine accepts structured memory candidates.
* Retrieval is deterministic lexical/rule-based rather than semantic embedding retrieval.
* Predicate aliases are intentionally limited and fixture-driven.
* Storage is in-memory and therefore not persistent across process restarts.
* The prototype is single-user.
* There is no polished memory-management UI.
* No model or external API is required.
* Ambiguous conflicts are preserved rather than automatically resolved.
* Production handling of highly sensitive memories would require additional policy, access controls, retention rules, and security measures.

These limitations are intentional. The implementation focuses on the challenge's required provenance, lifecycle, conservative reconciliation, bounded retrieval, explainability, and deterministic verification behaviour.

## Production and scale

The submitted implementation is intentionally a small in-memory prototype.

For production, I would preserve the domain and lifecycle contracts while replacing the storage and retrieval implementations.

### Persistence

Replace the in-memory repository with a transactional database implementation.

Lifecycle transitions such as:

```text
active → superseded
active → deleted
```

should be atomic so concurrent updates cannot create inconsistent current states.

### Retrieval at larger scale

For larger memory collections, I would introduce indexed retrieval and potentially hybrid lexical + embedding retrieval.

The lifecycle filter would remain a hard constraint:

```text
deleted/superseded → never eligible for current retrieval
active             → eligible for retrieval
```

Semantic similarity should improve candidate recall, not override lifecycle state.

### Concurrency and auditability

Production would also require:

* optimistic concurrency or equivalent conflict handling
* stronger audit logs
* user-level isolation
* retention policies
* access controls
* encryption for sensitive data
* monitoring of retrieval quality
* regression evaluation fixtures
* operational observability

The submitted prototype does not implement these production concerns.

## AI usage

AI-assisted development tools were used during implementation.

They were used primarily for:

* discussing architecture and decomposition
* reviewing implementation approaches
* identifying edge cases
* improving test coverage
* reviewing benchmark and submission structure

The final implementation was manually reviewed and verified by running:

* the automated test suite
* TypeScript type checking
* the deterministic benchmark
* the CLI demonstration

No external model is required at runtime, and no AI-generated result is treated as the source of truth for benchmark correctness.

## Credibility note

### NexFlow

NexFlow is an AI workflow automation SaaS I built to explore product-grade workflow orchestration and AI integrations.

**Problem solved**

Businesses often need to connect forms, communication channels, AI models, and business actions without manually moving information between systems. NexFlow provides a workflow-based automation layer for connecting these operations.

**My contribution**

I designed and implemented the application architecture and core workflow execution system, including:

* Next.js / TypeScript application
* React Flow-based workflow builder
* Prisma / PostgreSQL data layer
* workflow execution and orchestration
* Inngest-based background execution
* AI provider integrations
* Gmail and WhatsApp integrations
* webhook and trigger handling
* execution state and realtime feedback
* workflow nodes and executor structure

**Engineering complexity**

The system coordinates multiple trigger and action types with asynchronous execution, persisted workflow state, external API integrations, and failure-sensitive execution paths.

One important design decision was separating trigger nodes from execution/action nodes and giving executors a consistent execution context. This made new integrations easier to add without redesigning the workflow engine.

**Evidence**

Repository:

https://github.com/ShubhamPawar-19/Nexflow

Live demo:

https://nexflow-swart.vercel.app/
