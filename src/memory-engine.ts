import {
  createMemory,
  type CreateMemoryInput,
} from "./domain/memory-factory.js";
import type { Memory } from "./domain/memory.js";
import type { SourceMessage } from "./domain/source-message.js";
import { supersedeMemory } from "./reconciliation/reconcile.js";
import {
  retrieveRelevantMemories,
  type RetrievalResult,
} from "./retrieval/retrieve.js";
import type { MemoryRepository } from "./storage/memory-repository.js";

export interface ReconcileInput extends CreateMemoryInput {
  readonly currentMemoryId?: string;
}

export class MemoryEngine {
  constructor(private readonly repository: MemoryRepository) {}

  storeMessage(message: SourceMessage): void {
    this.repository.saveSourceMessage(message);
  }

  storeMemory(input: CreateMemoryInput): Memory {
    const memory = createMemory(input);

    const source = this.repository.getSourceMessageById(
      memory.sourceMessageId,
    );

    if (!source) {
      throw new Error(
        `Source message not found: ${memory.sourceMessageId}`,
      );
    }

    this.repository.saveMemory(memory);

    return memory;
  }

  reconcile(input: ReconcileInput): Memory {
    if (!input.currentMemoryId) {
      return this.storeMemory(input);
    }

    const current = this.repository.getMemoryById(
      input.currentMemoryId,
    );

    if (!current) {
      throw new Error(
        `Memory not found: ${input.currentMemoryId}`,
      );
    }

    const source = this.repository.getSourceMessageById(
  input.sourceMessageId,
);

if (!source) {
  throw new Error(
    `Source message not found: ${input.sourceMessageId}`,
  );
}

    const candidate = createMemory(input);

    // An explicit currentMemoryId means this is an explicit correction.
    // Supersede the old memory while preserving its history.
    return supersedeMemory(
      this.repository,
      current.id,
      candidate,
    ).created;
  }

  retrieve(
    query: string,
    limit = 5,
  ): RetrievalResult[] {
    return retrieveRelevantMemories(
      this.repository,
      query,
      { limit },
    );
  }

  getMemory(id: string): Memory | undefined {
    return this.repository.getMemoryById(id);
  }

  getSourceMessage(id: string): SourceMessage | undefined {
    return this.repository.getSourceMessageById(id);
  }

  deleteMemory(id: string, deletedAt: string): Memory {
    const memory = this.repository.getMemoryById(id);

    if (!memory) {
      throw new Error(`Memory not found: ${id}`);
    }

    if (memory.status === "deleted") {
      return memory;
    }

    const deletedMemory: Memory = {
      ...memory,
      status: "deleted",
      updatedAt: deletedAt,
    };

    this.repository.updateMemory(deletedMemory);

    return deletedMemory;
  }

  inspectAll(): Memory[] {
    return this.repository.getAllMemories();
  }
}