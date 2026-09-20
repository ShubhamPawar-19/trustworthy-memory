import type { Memory, MemoryStatus } from "../domain/memory.js";
import type { SourceMessage } from "../domain/source-message.js";
import type { MemoryRepository } from "./memory-repository.js";

export class InMemoryMemoryRepository implements MemoryRepository {
  private readonly memories = new Map<string, Memory>();
  private readonly sourceMessages = new Map<string, SourceMessage>();

  saveMemory(memory: Memory): void {
    this.memories.set(memory.id, memory);
  }

  getMemoryById(id: string): Memory | undefined {
    return this.memories.get(id);
  }

  getMemoriesByStatus(status: MemoryStatus): Memory[] {
    return [...this.memories.values()].filter(
      (memory) => memory.status === status,
    );
  }

  getAllMemories(): Memory[] {
    return [...this.memories.values()];
  }

  saveSourceMessage(message: SourceMessage): void {
    this.sourceMessages.set(message.id, message);
  }

  getSourceMessageById(id: string): SourceMessage | undefined {
    return this.sourceMessages.get(id);
  }

  updateMemory(memory: Memory): void {
    if (!this.memories.has(memory.id)) {
      throw new Error(`Memory not found: ${memory.id}`);
    }

    this.memories.set(memory.id, memory);
  }
}