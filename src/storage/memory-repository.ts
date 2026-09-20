import type { Memory, MemoryStatus } from "../domain/memory.js";
import type { SourceMessage } from "../domain/source-message.js";

export interface MemoryRepository {
  saveMemory(memory: Memory): void;

  getMemoryById(id: string): Memory | undefined;

  getMemoriesByStatus(status: MemoryStatus): Memory[];

  getAllMemories(): Memory[];

  saveSourceMessage(message: SourceMessage): void;

  getSourceMessageById(id: string): SourceMessage | undefined;

  updateMemory(memory: Memory): void;
}