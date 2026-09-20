import { MemoryEngine } from "./memory-engine.js";
import { InMemoryMemoryRepository } from "./storage/in-memory-memory-repository.js";

const repository = new InMemoryMemoryRepository();
const engine = new MemoryEngine(repository);

function printMemory(label: string, id: string): void {
  const memory = engine.getMemory(id);

  if (!memory) {
    console.log(`${label}: not found`);
    return;
  }

  console.log(`${label}:`);
  console.log(`  id:        ${memory.id}`);
  console.log(`  fact:      ${memory.subject} ${memory.predicate} ${memory.value}`);
  console.log(`  status:    ${memory.status}`);
  console.log(`  source:    ${memory.sourceMessageId}`);
  console.log(`  supersedes:${memory.supersedesId ?? "none"}`);
  console.log(`  replaced:  ${memory.supersededById ?? "none"}`);
}

console.log("");
console.log("Trustworthy Memory Demo");
console.log("=======================");

console.log("");
console.log("1. Store memory with provenance");

engine.storeMessage({
  id: "demo-msg-001",
  content: "I live in Pune.",
  createdAt: "2026-09-20T10:00:00.000Z",
});

engine.storeMemory({
  id: "demo-mem-pune",
  subject: "user",
  predicate: "lives_in",
  value: "Pune",
  sourceMessageId: "demo-msg-001",
  createdAt: "2026-09-20T10:00:00.000Z",
});

printMemory("Stored memory", "demo-mem-pune");

console.log("");
console.log("2. Retrieve current context");

const beforeCorrection = engine.retrieve(
  "Where does the user live?",
);

for (const result of beforeCorrection) {
  console.log(
    `  ${result.memory.value} | score=${result.score} | ${result.reason}`,
  );
}

console.log("");
console.log("3. Explicit correction: Pune -> Mumbai");

engine.storeMessage({
  id: "demo-msg-002",
  content: "I moved to Mumbai.",
  createdAt: "2026-09-20T11:00:00.000Z",
});

engine.reconcile({
  id: "demo-mem-mumbai",
  subject: "user",
  predicate: "lives_in",
  value: "Mumbai",
  sourceMessageId: "demo-msg-002",
  createdAt: "2026-09-20T11:00:00.000Z",
  currentMemoryId: "demo-mem-pune",
});

printMemory("Old memory", "demo-mem-pune");
printMemory("Current memory", "demo-mem-mumbai");

console.log("");
console.log("4. Retrieve after correction");

const afterCorrection = engine.retrieve(
  "Where does the user live?",
);

for (const result of afterCorrection) {
  console.log(
    `  ${result.memory.value} | score=${result.score} | ${result.reason}`,
  );
}

console.log("");
console.log("5. Delete current memory");

engine.deleteMemory(
  "demo-mem-mumbai",
  "2026-09-20T12:00:00.000Z",
);

const afterDeletion = engine.retrieve(
  "Where does the user live?",
);

console.log(
  `  Current retrieval results: ${afterDeletion.length}`,
);

console.log("");
console.log("Demo complete.");