import type { Memory } from "../domain/memory.js";

export type ReconciliationDecision =
  | {
      readonly type: "supersede";
      readonly reason: string;
    }
  | {
      readonly type: "keep_both";
      readonly reason: string;
    };

export function decideReconciliation(
  current: Memory,
  candidate: Memory,
): ReconciliationDecision {
  const sameFact =
    current.subject === candidate.subject &&
    current.predicate === candidate.predicate;

  if (!sameFact) {
    return {
      type: "keep_both",
      reason: "Different facts do not conflict.",
    };
  }

  if (current.value === candidate.value) {
    return {
      type: "keep_both",
      reason: "Candidate repeats the existing fact.",
    };
  }

  // Explicit replacement is required for automatic supersession.
  // Mere value conflict is treated conservatively.
  return {
    type: "keep_both",
    reason:
      "Conflicting values require explicit replacement semantics; history is preserved.",
  };
}