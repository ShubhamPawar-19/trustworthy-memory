import { describe, expect, it } from "vitest";

import { MemoryEngine } from "../src/memory-engine.js";
import { retrieveRelevantMemories } from "../src/retrieval/retrieve.js";
import { InMemoryMemoryRepository } from "../src/storage/in-memory-memory-repository.js";

describe("memory lifecycle", () => {
  it("deletes a memory from current retrieval while preserving history", () => {
    const repository = new InMemoryMemoryRepository();
    const engine = new MemoryEngine(repository);

    engine.storeMessage({
      id: "msg-1",
      content: "I live in Pune.",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    engine.storeMemory({
      id: "mem-pune",
      subject: "user",
      predicate: "lives_in",
      value: "Pune",
      sourceMessageId: "msg-1",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    const deleted = engine.deleteMemory(
      "mem-pune",
      "2026-09-20T12:00:00.000Z",
    );

    expect(deleted.status).toBe("deleted");

    const results = retrieveRelevantMemories(
      repository,
      "Where does the user live?",
    );

    expect(results).toHaveLength(0);

    const historicalMemory = engine.getMemory("mem-pune");

    expect(historicalMemory?.status).toBe("deleted");
    expect(historicalMemory?.sourceMessageId).toBe("msg-1");
  });
});