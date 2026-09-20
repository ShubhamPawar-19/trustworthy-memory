import { describe, expect, it } from "vitest";

import { createMemory } from "../src/domain/memory-factory.js";
import { retrieveRelevantMemories } from "../src/retrieval/retrieve.js";
import { InMemoryMemoryRepository } from "../src/storage/in-memory-memory-repository.js";

describe("memory retrieval", () => {
  it("returns relevant active memories with observable evidence", () => {
    const repository = new InMemoryMemoryRepository();

    repository.saveMemory(
      createMemory({
        id: "mem-pune",
        subject: "user",
        predicate: "lives_in",
        value: "Pune",
        sourceMessageId: "msg-1",
        createdAt: "2026-09-20T10:00:00.000Z",
      }),
    );

    repository.saveMemory(
      createMemory({
        id: "mem-job",
        subject: "user",
        predicate: "works_as",
        value: "Software Engineer",
        sourceMessageId: "msg-2",
        createdAt: "2026-09-20T10:01:00.000Z",
      }),
    );

    const results = retrieveRelevantMemories(
      repository,
      "Where does the user live?",
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.memory.value).toBe("Pune");
    expect(results[0]?.score).toBeGreaterThan(0);
    expect(results[0]?.matchedFields.length).toBeGreaterThan(0);
    expect(results[0]?.reason).toContain("score");
  });

  it("excludes unrelated memories", () => {
    const repository = new InMemoryMemoryRepository();

    repository.saveMemory(
      createMemory({
        id: "mem-job",
        subject: "user",
        predicate: "works_as",
        value: "Software Engineer",
        sourceMessageId: "msg-1",
        createdAt: "2026-09-20T10:00:00.000Z",
      }),
    );

    const results = retrieveRelevantMemories(
      repository,
      "Where does the user live?",
    );

    expect(results).toHaveLength(0);
  });

  it("never returns superseded memories", () => {
    const repository = new InMemoryMemoryRepository();

    const oldMemory = createMemory({
      id: "mem-pune",
      subject: "user",
      predicate: "lives_in",
      value: "Pune",
      sourceMessageId: "msg-1",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    repository.saveMemory({
      ...oldMemory,
      status: "superseded",
      supersededById: "mem-mumbai",
    });

    repository.saveMemory(
      createMemory({
        id: "mem-mumbai",
        subject: "user",
        predicate: "lives_in",
        value: "Mumbai",
        sourceMessageId: "msg-2",
        createdAt: "2026-09-20T11:00:00.000Z",
        supersedesId: "mem-pune",
      }),
    );

    const results = retrieveRelevantMemories(
      repository,
      "Where does the user live?",
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.memory.value).toBe("Mumbai");
  });

  it("bounds the number of returned memories", () => {
    const repository = new InMemoryMemoryRepository();

    for (let index = 1; index <= 10; index += 1) {
      repository.saveMemory(
        createMemory({
          id: `mem-${index}`,
          subject: "user",
          predicate: "favorite_food",
          value: `Food ${index}`,
          sourceMessageId: `msg-${index}`,
          createdAt: `2026-09-20T10:${String(index).padStart(2, "0")}:00.000Z`,
        }),
      );
    }

    const results = retrieveRelevantMemories(
      repository,
      "What is the user's favorite food?",
      { limit: 3 },
    );

    expect(results).toHaveLength(3);
  });
});