import { describe, expect, it } from "vitest";

import { createMemory } from "../src/domain/memory-factory.js";
import { decideReconciliation } from "../src/reconciliation/rules.js";

describe("reconciliation policy", () => {
  it("does not silently replace a memory when the contradiction is ambiguous", () => {
    const current = createMemory({
      id: "mem-pune",
      subject: "user",
      predicate: "lives_in",
      value: "Pune",
      sourceMessageId: "msg-1",
      createdAt: "2026-09-20T10:00:00.000Z",
    });

    const candidate = createMemory({
      id: "mem-mumbai",
      subject: "user",
      predicate: "lives_in",
      value: "Mumbai",
      sourceMessageId: "msg-2",
      createdAt: "2026-09-20T11:00:00.000Z",
    });

    const decision = decideReconciliation(current, candidate);

    expect(decision.type).toBe("keep_both");
    expect(decision.reason).toContain("explicit replacement");
  });
});