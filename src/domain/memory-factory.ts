import type { Memory, MemoryStatus } from "./memory.js";

export interface CreateMemoryInput {
  readonly id: string;
  readonly subject: string;
  readonly predicate: string;
  readonly value: string;
  readonly sourceMessageId: string;
  readonly createdAt: string;
  readonly supersedesId?: string | null;
}

export function createMemory(input: CreateMemoryInput): Memory {
  const supersedesId = input.supersedesId ?? null;

  const memory: Memory = {
    id: input.id,
    subject: input.subject,
    predicate: input.predicate,
    value: input.value,
    status: "active" satisfies MemoryStatus,
    sourceMessageId: input.sourceMessageId,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    supersedesId,
    supersededById: null,
  };

  return memory;
}