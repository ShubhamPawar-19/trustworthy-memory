# Trustworthy Long-Term Memory

A deterministic prototype for storing, reconciling, retrieving, and deleting conversational memories while preserving provenance and lifecycle history.

Built for **Caygnus Product Engineering Challenge — Problem 4: Trustworthy Long-Term Memory**.

## Overview

Long-term conversational memory is not just about storing facts. A useful memory system must also know:

* where a memory came from
* whether it is currently active
* when it was created or updated
* whether it replaced another memory
* whether it has been deleted
* why it was selected for the current context
* when a conflicting observation is too ambiguous to replace existing information

This implementation focuses on those lifecycle and correctness guarantees rather than introducing a model, vector database, or production-scale infrastructure.

The core design is:

```text
Source Message
      │
      ▼
Structured Memory Candidate
      │
      ▼
  Memory Engine
      │
      ├──────────────► Storage
      │
      ├──────────────► Reconciliation
      │
      └──────────────► Retrieval
```

## Key guarantees

### Provenance

Every memory references the source message from which it originated.

A memory contains:

```text
id
subject
predicate
value
sourceMessageId
createdAt
updatedAt
status
supersedesId
supersededById
```

This allows a reviewer to inspect both the memory and its source.

### Explicit supersession

A conflicting fact does not automatically replace an existing memory.

An explicit replacement must identify the memory being corrected:

```text
Pune
  │
  └── superseded by ──► Mumbai
```

The original memory remains stored as historical information.

Its lifecycle changes from:

```text
active → superseded
```

The replacement becomes:

```text
active
```

### Conservative ambiguity handling

If two memories conflict but there is no explicit replacement relationship, both are preserved.

For example:

```text
Company = Acme
Company = Beta
```

Without an explicit replacement target, the system does not guess which value is correct.

This is a deliberate conservative policy.

### Deletion

Deletion uses a soft-delete lifecycle:

```text
active → deleted
```

The record remains inspectable for provenance and history but is excluded from current retrieval.

### Bounded, explainable retrieval

Retrieval considers only active memories.

Each returned result includes:

* memory
* score
* matched fields
* human-readable reason

Results are deterministically sorted and bounded by a configurable limit.

The default limit is five memories.

## Example

Suppose the system stores:

```text
User lives in Pune.
```

The memory is:

```text
subject: user
predicate: lives_in
value: Pune
status: active
```

The user later explicitly corrects it:

```text
I moved to Mumbai.
```

The resulting lifecycle is:

```text
Pune
  status: superseded
  supersededById: Mumbai

Mumbai
  status: active
  supersedesId: Pune
```

A subsequent location retrieval returns Mumbai and excludes Pune from current context.

If Mumbai is then deleted:

```text
Mumbai
  status: deleted
```

the retrieval result becomes empty while the historical record remains available for inspection.

## Architecture

The implementation is intentionally divided into separate responsibilities.

```text
src/
├── domain/
│   ├── memory.ts
│   ├── memory-factory.ts
│   └── source-message.ts
│
├── storage/
│   ├── memory-repository.ts
│   └── in-memory-memory-repository.ts
│
├── reconciliation/
│   ├── reconcile.ts
│   └── rules.ts
│
├── retrieval/
│   ├── retrieve.ts
│   └── scoring.ts
│
└── memory-engine.ts
```

### Domain

Defines the core memory and source-message contracts.

The domain models the memory lifecycle:

```text
active
superseded
deleted
```

### Storage

`MemoryRepository` defines the persistence interface.

The submitted implementation uses an in-memory repository to keep the challenge deterministic and dependency-free.

The repository stores:

* memory records
* source messages

### Reconciliation

The reconciliation layer handles:

* explicit supersession
* lifecycle transitions
* supersession links
* conservative conflict decisions

An explicit correction updates both sides of the relationship:

```text
oldMemory.supersededById = newMemory.id
newMemory.supersedesId = oldMemory.id
```

### Retrieval

The retrieval layer:

1. considers active memories only
2. normalizes the query
3. matches predicate aliases
4. considers value matches
5. calculates a deterministic score
6. records matched fields
7. sorts results deterministically
8. applies the result limit

Superseded and deleted memories are never eligible for current retrieval.

### Memory Engine

`MemoryEngine` provides the main application-level operations:

```text
storeMessage()
storeMemory()
reconcile()
retrieve()
getMemory()
getSourceMessage()
deleteMemory()
inspectAll()
```

This keeps callers independent from the underlying repository and reconciliation implementation.

## Deterministic benchmark

The benchmark is built around fixed local fixtures.

```text
fixtures/
├── memories.json
├── corrections.json
├── ambiguous.json
└── queries.json
```

The fixture set contains:

* 30 baseline memories
* 6 correction operations
* 2 ambiguous conflicting candidates
* 20 fixed retrieval queries

After materialization, the benchmark contains 38 memory records, including preserved superseded history.

### Benchmark command

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

The benchmark also verifies lifecycle chains and ambiguous conflicts.

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

The benchmark fails if:

* an expected memory is missing
* an excluded memory is returned
* a superseded memory appears in current retrieval
* a deleted memory appears in current retrieval
* lifecycle links are inconsistent
* an ambiguous conflict is incorrectly resolved

## Tests

Run the automated test suite:

```bash
npm test
```

Observed result:

```text
10/10 tests passing
```

Type checking:

```bash
npm run typecheck
```

The project currently has no runtime model dependency, external API dependency, or database dependency.

## Running locally

### Requirements

* Node.js 20+
* npm

### Install

```bash
npm install
```

### Run the CLI demo

```bash
npm run dev
```

The demo walks through:

1. storing a memory with provenance
2. retrieving current context
3. correcting Pune → Mumbai
4. inspecting the supersession relationship
5. retrieving the corrected context
6. deleting the current memory
7. verifying that retrieval returns zero results

### Run all verification

```bash
npm test
npm run typecheck
npm run benchmark
```

## Technology choices

### TypeScript

Strict TypeScript contracts make lifecycle transitions and repository boundaries explicit.

### Node.js

Node.js keeps the prototype lightweight and easy to execute without infrastructure.

### Vitest

Vitest provides fast deterministic unit testing.

### In-memory repository

A database was intentionally avoided.

The challenge is primarily about:

* provenance
* lifecycle correctness
* reconciliation
* bounded retrieval
* explainability
* deterministic evaluation

An in-memory implementation keeps those behaviours easy to inspect and reproduce.

### Rule-based retrieval

No LLM or embedding model is used at runtime.

Retrieval uses deterministic predicate aliases and value matching.

This provides observable behaviour for every benchmark query and avoids making correctness dependent on model or embedding behaviour.

## Important design decisions

### Explicit replacement instead of automatic contradiction resolution

The system does not assume that a newer conflicting observation is necessarily a correction.

Only an explicit replacement target triggers supersession.

This avoids silently destroying potentially valid historical information.

### Lifecycle is a hard retrieval constraint

Retrieval does not treat lifecycle state as a ranking signal.

Instead:

```text
deleted    → excluded
superseded → excluded
active     → eligible
```

This prevents a high lexical or semantic score from accidentally resurrecting stale information.

### History is preserved

Superseded and deleted memories remain stored.

This makes it possible to inspect:

* what the system previously believed
* where that belief came from
* what replaced it
* when its lifecycle changed

## Scope and limitations

This implementation intentionally does not include:

* automatic natural-language memory extraction
* LLM-based memory extraction
* embeddings
* vector databases
* a production database
* a multi-user architecture
* a memory-management UI
* multimodal memory
* production authentication or authorization

Memory candidates are supplied as structured data.

Predicate aliases are intentionally limited and fixture-driven.

The repository is in-memory, so data does not survive process restarts.

These constraints keep the implementation focused on the challenge's core correctness requirements.

## Production evolution

A production implementation could retain the same domain and lifecycle contracts while replacing the underlying infrastructure.

### Persistent storage

Move from the in-memory repository to a transactional database.

Lifecycle transitions should be atomic:

```text
active → superseded
active → deleted
```

### Retrieval

At larger scale, retrieval could use:

```text
lexical search
     +
semantic embeddings
     +
metadata filtering
```

However, lifecycle filtering should remain a hard constraint.

Semantic similarity should improve recall, not override memory lifecycle.

### Concurrency

Production would require concurrency controls to prevent conflicting updates from creating multiple active replacements.

### Security and privacy

A production memory system would also require:

* user isolation
* access controls
* encryption
* retention policies
* deletion guarantees
* audit logging
* sensitive-memory policies
* monitoring and evaluation

## AI usage

AI-assisted development tools were used during implementation for architecture discussion, edge-case analysis, test coverage review, and documentation.

The final implementation was manually reviewed and verified through:

* automated tests
* TypeScript type checking
* deterministic benchmark execution
* CLI demonstration

No external AI model is required to run the submitted implementation.

## Project structure

```text
trustworthy-memory/
├── benchmark/
│   └── run.ts
│
├── fixtures/
│   ├── ambiguous.json
│   ├── corrections.json
│   ├── memories.json
│   └── queries.json
│
├── src/
│   ├── domain/
│   ├── reconciliation/
│   ├── retrieval/
│   ├── storage/
│   ├── index.ts
│   └── memory-engine.ts
│
├── tests/
│
├── package.json
├── package-lock.json
├── SUBMISSION.md
├── tsconfig.json
└── README.md
```

## Challenge

**Caygnus Product Engineering Challenge**

**Selected problem:** Problem 4 — Trustworthy Long-Term Memory

The implementation prioritizes provenance, explicit lifecycle transitions, conservative conflict handling, bounded explainable retrieval, and deterministic evaluation.
