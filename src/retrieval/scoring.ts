import type { Memory } from "../domain/memory.js";

export interface MemoryScore {
  readonly memory: Memory;
  readonly score: number;
  readonly matchedFields: string[];
}

const PREDICATE_ALIASES: Record<string, string[]> = {
  lives_in: [
    "live",
    "lives",
    "living",
    "where does the user live",
    "where is the user living",
  ],
  works_as: [
    "work",
    "works",
    "job",
    "occupation",
    "role",
    "do for work",
  ],
  favorite_food: [
    "favorite food",
    "favourite food",
    "food",
  ],
  favorite_color: [
    "favorite color",
    "favourite color",
    "color",
    "colour",
  ],
  hobby: [
    "hobby",
    "hobbies",
  ],
  programming_language: [
    "programming language",
    "coding language",
  ],
  editor: [
    "editor",
    "code editor",
  ],
  framework: [
    "framework",
  ],
  database: [
    "database",
    "db",
  ],
  cloud: [
    "cloud",
    "cloud platform",
  ],
  music: [
    "music",
    "listen to",
  ],
  sport: [
    "sport",
    "sports",
  ],
  pet: [
    "pet",
    "animal",
  ],
  education: [
    "study",
    "studied",
    "education",
    "degree",
  ],
  timezone: [
    "timezone",
    "time zone",
  ],
  country: [
    "country",
    "from",
  ],
  language: [
    "language",
    "speak",
    "speaks",
  ],
  travel_destination: [
    "travel",
    "travel destination",
    "visit",
    "go on vacation",
  ],
  goal: [
    "goal",
    "want to achieve",
    "objective",
  ],
};

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

export function scoreMemory(
  memory: Memory,
  query: string,
): MemoryScore {
  const normalizedQuery = normalize(query);
  const normalizedPredicate = normalize(memory.predicate);
  const normalizedValue = normalize(memory.value);

  const matchedFields: string[] = [];
  let score = 0;

  const aliases =
    PREDICATE_ALIASES[normalizedPredicate] ?? [];

  const predicateMatched =
    normalizedQuery.includes(normalizedPredicate) ||
    normalizedQuery.includes(
      normalizedPredicate.replaceAll("_", " "),
    ) ||
    aliases.some((alias) =>
      normalizedQuery.includes(alias),
    );

  if (predicateMatched) {
    score += 5;
    matchedFields.push("predicate");
  }

  if (normalizedQuery.includes(normalizedValue)) {
    score += 2;
    matchedFields.push("value");
  }

  return {
    memory,
    score,
    matchedFields,
  };
}