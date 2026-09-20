export const MEMORY_STATUSES = [
  "active",
  "superseded",
  "deleted",
] as const;

export type MemoryStatus = (typeof MEMORY_STATUSES)[number];

export interface Memory {
  readonly id: string;

  /**
   * The entity this memory describes.
   * Example: "user"
   */
  readonly subject: string;

  /**
   * The normalized fact/property.
   * Example: "lives_in"
   */
  readonly predicate: string;

  /**
   * The normalized value.
   * Example: "Mumbai"
   */
  readonly value: string;

  readonly status: MemoryStatus;

  /**
   * The source message from which this memory originated.
   */
  readonly sourceMessageId: string;

  readonly createdAt: string;
  readonly updatedAt: string;

  /**
   * If this memory explicitly replaces another memory.
   */
  readonly supersedesId: string | null;

  /**
   * If another memory explicitly replaced this memory.
   */
  readonly supersededById: string | null;
}