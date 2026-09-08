import { describe, it, expect, beforeEach } from "vitest";
import { registerExercise, getPlugin, hasPlugin, clearRegistry } from "../lib/exercises/registry";
import { z } from "zod";
import type { ExerciseType } from "../lib/exercises/types";

describe("exercise registry", () => {
  beforeEach(() => clearRegistry());

  it("registers and retrieves plugin", () => {
    const plugin = {
      type: "fill_blanks" as ExerciseType,
      promptSchema: z.object({ text: z.string() }),
      answerSchema: z.object({ answer: z.string() }),
      solutionSchema: z.object({ answer: z.string() }),
      evaluate: () => ({ score: 100, feedback: "ok" }),
    };
    registerExercise(plugin);
    expect(hasPlugin("fill_blanks")).toBe(true);
    expect(getPlugin("fill_blanks")).toBeDefined();
  });

  it("plugin isolation - adding new type does not break existing", () => {
    const p1 = { type: "fill_blanks" as ExerciseType, promptSchema: z.object({}), answerSchema: z.object({}), solutionSchema: z.object({}), evaluate: () => ({ score: 100, feedback: "" }) };
    const p2 = { type: "ordering" as ExerciseType, promptSchema: z.object({}), answerSchema: z.object({}), solutionSchema: z.object({}), evaluate: () => ({ score: 0, feedback: "" }) };
    registerExercise(p1);
    registerExercise(p2);
    expect(getPlugin("fill_blanks")?.type).toBe("fill_blanks");
    expect(getPlugin("ordering")?.type).toBe("ordering");
  });
});
