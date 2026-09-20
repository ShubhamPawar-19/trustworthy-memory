import { describe, expect, it } from "vitest";

import { MemoryEngine } from "../src/memory-engine.js";
import { InMemoryMemoryRepository } from "../src/storage/in-memory-memory-repository.js";

describe("memory storage and provenance", () => {
  it("stores a memory with stable identity and source provenance", () => {
    const repository = new InMemoryMemoryRepository();
    const engine = new MemoryEngine(repository);

    engine.storeMessage({
      id: "msg-001",
      content: "I live in Pune.",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    const memory = engine.storeMemory({
      id: "mem-001",
      subject: "user",
      predicate: "lives_in",
      value: "Pune",
      sourceMessageId: "msg-001",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    expect(memory.id).toBe("mem-001");
    expect(memory.status).toBe("active");
    expect(memory.sourceMessageId).toBe("msg-001");

    const source = engine.getSourceMessage(memory.sourceMessageId);

    expect(source?.id).toBe("msg-001");
    expect(source?.content).toBe("I live in Pune.");
  });

  it("rejects a memory when its source message does not exist", () => {
    const repository = new InMemoryMemoryRepository();
    const engine = new MemoryEngine(repository);

    expect(() =>
      engine.storeMemory({
        id: "mem-002",
        subject: "user",
        predicate: "lives_in",
        value: "Mumbai",
        sourceMessageId: "missing-message",
        createdAt: "2026-09-20T10:00:00.000Z",
      }),
    ).toThrow("Source message not found");
  });
});