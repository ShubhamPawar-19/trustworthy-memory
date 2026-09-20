import type { Memory } from "../domain/memory.js";
import type { MemoryRepository } from "../storage/memory-repository.js";

export interface ReconciliationResult {
  readonly created: Memory;
  readonly superseded: Memory | null;
}

export function supersedeMemory(
  repository: MemoryRepository,
  currentMemoryId: string,
  replacement: Memory,
): ReconciliationResult {
  const current = repository.getMemoryById(currentMemoryId);

  if (!current) {
    throw new Error(`Memory not found: ${currentMemoryId}`);
  }

  if (current.status !== "active") {
    throw new Error(
      `Memory ${currentMemoryId} cannot be superseded because it is ${current.status}`,
    );
  }

  const updatedCurrent: Memory = {
    ...current,
    status: "superseded",
    updatedAt: replacement.createdAt,
    supersededById: replacement.id,
  };

  const replacementWithLink: Memory = {
    ...replacement,
    supersedesId: current.id,
  };

  repository.updateMemory(updatedCurrent);
  repository.saveMemory(replacementWithLink);

  return {
    created: replacementWithLink,
    superseded: updatedCurrent,
  };
}