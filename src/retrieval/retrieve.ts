import type { Memory } from "../domain/memory.js";
import type { MemoryRepository } from "../storage/memory-repository.js";
import { scoreMemory, type MemoryScore } from "./scoring.js";

export interface RetrievalResult {
  readonly memory: Memory;
  readonly score: number;
  readonly matchedFields: string[];
  readonly reason: string;
}

export interface RetrievalOptions {
  readonly limit?: number;
}

export function retrieveRelevantMemories(
  repository: MemoryRepository,
  query: string,
  options: RetrievalOptions = {},
): RetrievalResult[] {
  const limit = options.limit ?? 5;

  if (limit <= 0) {
    return [];
  }

  const scored: MemoryScore[] = repository
    .getMemoriesByStatus("active")
    .map((memory) => scoreMemory(memory, query))
    .filter((result) => result.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.memory.id.localeCompare(b.memory.id);
    });

  return scored.slice(0, limit).map((result) => ({
    memory: result.memory,
    score: result.score,
    matchedFields: result.matchedFields,
    reason: `Matched ${result.matchedFields.join(", ")} with score ${result.score}.`,
  }));
}