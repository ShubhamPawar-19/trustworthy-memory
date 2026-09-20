import { describe, expect, it } from "vitest";

import { MemoryEngine } from "../src/memory-engine.js";
import { InMemoryMemoryRepository } from "../src/storage/in-memory-memory-repository.js";

describe("MemoryEngine end-to-end lifecycle", () => {
  it("handles correction, retrieval, history, and deletion", () => {
    const repository = new InMemoryMemoryRepository();
    const engine = new MemoryEngine(repository);

    engine.storeMessage({
      id: "msg-pune",
      content: "I live in Pune.",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    engine.storeMemory({
      id: "mem-pune",
      subject: "user",
      predicate: "lives_in",
      value: "Pune",
      sourceMessageId: "msg-pune",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    engine.storeMessage({
      id: "msg-mumbai",
      content: "I moved to Mumbai.",
      createdAt: "2026-09-20T11:00:00.000Z",
    });

    const mumbai = engine.reconcile({
      id: "mem-mumbai",
      subject: "user",
      predicate: "lives_in",
      value: "Mumbai",
      sourceMessageId: "msg-mumbai",
      createdAt: "2026-09-20T11:00:00.000Z",
      currentMemoryId: "mem-pune",
    });

    expect(mumbai.status).toBe("active");
    expect(mumbai.supersedesId).toBe("mem-pune");

    const currentResults = engine.retrieve(
      "Where does the user live?",
    );

    expect(currentResults).toHaveLength(1);
    expect(currentResults[0]?.memory.value).toBe("Mumbai");

    const oldMemory = engine.getMemory("mem-pune");

    expect(oldMemory?.status).toBe("superseded");
    expect(oldMemory?.supersededById).toBe("mem-mumbai");

    const source = engine.getSourceMessage(
      mumbai.sourceMessageId,
    );

    expect(source?.content).toBe("I moved to Mumbai.");

    engine.deleteMemory(
      "mem-mumbai",
      "2026-09-20T12:00:00.000Z",
    );

    const afterDeletion = engine.retrieve(
      "Where does the user live?",
    );

    expect(afterDeletion).toHaveLength(0);

    expect(engine.getMemory("mem-mumbai")?.status).toBe(
      "deleted",
    );
  });
});