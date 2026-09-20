import { describe, expect, it } from "vitest";

import { createMemory } from "../src/domain/memory-factory.js";
import { supersedeMemory } from "../src/reconciliation/reconcile.js";
import { InMemoryMemoryRepository } from "../src/storage/in-memory-memory-repository.js";

describe("memory reconciliation", () => {
  it("supersedes an outdated memory and preserves the history", () => {
    const repository = new InMemoryMemoryRepository();

    const pune = createMemory({
      id: "mem-pune",
      subject: "user",
      predicate: "lives_in",
      value: "Pune",
      sourceMessageId: "msg-pune",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    repository.saveMemory(pune);

    const mumbai = createMemory({
      id: "mem-mumbai",
      subject: "user",
      predicate: "lives_in",
      value: "Mumbai",
      sourceMessageId: "msg-mumbai",
      createdAt: "2026-09-20T11:00:00.000Z",
    });

    const result = supersedeMemory(repository, "mem-pune", mumbai);

    expect(result.created.status).toBe("active");
    expect(result.created.value).toBe("Mumbai");
    expect(result.created.supersedesId).toBe("mem-pune");

    const oldMemory = repository.getMemoryById("mem-pune");

    expect(oldMemory?.status).toBe("superseded");
    expect(oldMemory?.supersededById).toBe("mem-mumbai");

    const activeMemories = repository.getMemoriesByStatus("active");

    expect(activeMemories).toHaveLength(1);
    expect(activeMemories[0]?.value).toBe("Mumbai");
  });
});