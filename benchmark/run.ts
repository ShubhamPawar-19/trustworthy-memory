import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { MemoryEngine } from "../src/memory-engine.js";
import { InMemoryMemoryRepository } from "../src/storage/in-memory-memory-repository.js";
import type { CreateMemoryInput } from "../src/domain/memory-factory.js";

interface FixtureMemory extends CreateMemoryInput {}

interface Correction {
  readonly fromMemoryId: string;
  readonly replacement: CreateMemoryInput;
}

interface AmbiguousCase {
  readonly id: string;
  readonly currentMemoryId: string;
  readonly candidate: CreateMemoryInput;
  readonly reason: string;
}

interface QueryCase {
  readonly id: string;
  readonly query: string;
  readonly include: string[];
  readonly exclude: string[];
}

async function loadJson<T>(fileName: string): Promise<T> {
  const filePath = resolve(process.cwd(), "fixtures", fileName);
  const content = await readFile(filePath, "utf8");

  return JSON.parse(content) as T;
}

async function main(): Promise<void> {
  const memories = await loadJson<FixtureMemory[]>("memories.json");
  const corrections = await loadJson<Correction[]>("corrections.json");
  const ambiguousCases =
    await loadJson<AmbiguousCase[]>("ambiguous.json");
  const queries = await loadJson<QueryCase[]>("queries.json");

  const repository = new InMemoryMemoryRepository();
  const engine = new MemoryEngine(repository);

  /*
   * 1. Register every source message before storing memories.
   * The benchmark uses deterministic fixture messages so provenance
   * can be inspected without any external model or service.
   */
  for (const memory of memories) {
    engine.storeMessage({
      id: memory.sourceMessageId,
      content: `${memory.predicate}: ${memory.value}`,
      createdAt: memory.createdAt,
    });
  }

  for (const correction of corrections) {
    engine.storeMessage({
      id: correction.replacement.sourceMessageId,
      content: `${correction.replacement.predicate}: ${correction.replacement.value}`,
      createdAt: correction.replacement.createdAt,
    });
  }

  for (const ambiguous of ambiguousCases) {
    engine.storeMessage({
      id: ambiguous.candidate.sourceMessageId,
      content: `${ambiguous.candidate.predicate}: ${ambiguous.candidate.value}`,
      createdAt: ambiguous.candidate.createdAt,
    });
  }

  /*
   * 2. Store baseline memories.
   */
  for (const memory of memories) {
    engine.storeMemory(memory);
  }

  /*
   * 3. Apply explicit corrections.
   *
   * currentMemoryId is the explicit user-confirmed replacement target.
   */
  for (const correction of corrections) {
    engine.reconcile({
      ...correction.replacement,
      currentMemoryId: correction.fromMemoryId,
    });
  }

  /*
   * 4. Apply ambiguous candidates WITHOUT a replacement target.
   *
   * Conservative policy:
   * uncertain contradiction does not silently supersede history.
   */
  for (const ambiguous of ambiguousCases) {
    engine.reconcile(ambiguous.candidate);
  }

  let passed = 0;
  let failed = 0;

  console.log("");
  console.log("Trustworthy Memory Benchmark");
  console.log("============================");
  console.log(`Memories: ${engine.inspectAll().length}`);
  console.log(`Queries:  ${queries.length}`);
  console.log("");

  for (const testCase of queries) {
    const results = engine.retrieve(testCase.query, 5);
    const resultIds = results.map((result) => result.memory.id);

    const missingExpected = testCase.include.filter(
      (id) => !resultIds.includes(id),
    );

    const unexpectedResults = testCase.exclude.filter(
      (id) => resultIds.includes(id),
    );

    const queryPassed =
      missingExpected.length === 0 &&
      unexpectedResults.length === 0;

    if (queryPassed) {
      passed += 1;
      console.log(`PASS ${testCase.id} - ${testCase.query}`);
    } else {
      failed += 1;
      console.log(`FAIL ${testCase.id} - ${testCase.query}`);

      if (missingExpected.length > 0) {
        console.log(
          `  Missing expected: ${missingExpected.join(", ")}`,
        );
      }

      if (unexpectedResults.length > 0) {
        console.log(
          `  Unexpected stale/excluded: ${unexpectedResults.join(", ")}`,
        );
      }

      console.log(
        `  Actual results: ${
          resultIds.length > 0 ? resultIds.join(", ") : "none"
        }`,
      );
    }
  }

console.log("");
console.log("----------------------------");

const puneOriginal = engine.getMemory("mem-001");
const mumbai = engine.getMemory("mem-031");
const puneCurrent = engine.getMemory("mem-032");

const lifecycleChecks = [
  {
    name: "Original Pune memory is superseded",
    passed: puneOriginal?.status === "superseded",
  },
  {
    name: "Mumbai memory supersedes original Pune",
    passed: mumbai?.supersedesId === "mem-001",
  },
  {
    name: "Original Pune points to Mumbai",
    passed: puneOriginal?.supersededById === "mem-031",
  },
  {
    name: "Current Pune memory supersedes Mumbai",
    passed: puneCurrent?.supersedesId === "mem-031",
  },
  {
    name: "Mumbai is superseded by current Pune",
    passed: mumbai?.status === "superseded",
  },
  {
    name: "Current Pune memory remains active",
    passed: puneCurrent?.status === "active",
  },
];

for (const check of lifecycleChecks) {
  if (check.passed) {
    console.log(`PASS lifecycle - ${check.name}`);
  } else {
    failed += 1;
    console.log(`FAIL lifecycle - ${check.name}`);
  }
}

const ambiguousCompany = engine.getMemory("mem-037");
const ambiguousFood = engine.getMemory("mem-038");
const originalCompany = engine.getMemory("mem-021");
const originalFood = engine.getMemory("mem-003");

const ambiguityChecks = [
  {
    name: "Ambiguous company conflict preserves original",
    passed:
      originalCompany?.status === "active" &&
      ambiguousCompany?.status === "active",
  },
  {
    name: "Ambiguous food conflict preserves original",
    passed:
      originalFood?.status === "active" &&
      ambiguousFood?.status === "active",
  },
];

for (const check of ambiguityChecks) {
  if (check.passed) {
    console.log(`PASS ambiguity - ${check.name}`);
  } else {
    failed += 1;
    console.log(`FAIL ambiguity - ${check.name}`);
  }
}

console.log("");
console.log(`Retrieval queries: ${passed === queries.length ? queries.length : passed}/${queries.length}`);
console.log(`Total failures: ${failed}`);

if (failed > 0) {
  console.log("Overall: FAIL");
  process.exitCode = 1;
  return;
}

console.log("Overall: PASS");
}

await main();