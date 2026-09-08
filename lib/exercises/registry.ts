import type { ExercisePlugin, ExerciseType } from "./types";

const registry = new Map<ExerciseType, ExercisePlugin<unknown, unknown>>();

export function registerExercise<TPrompt, TAnswer>(
  plugin: ExercisePlugin<TPrompt, TAnswer>,
): void {
  registry.set(plugin.type, plugin as ExercisePlugin<unknown, unknown>);
}

export function getPlugin<TPrompt, TAnswer>(
  type: ExerciseType,
): ExercisePlugin<TPrompt, TAnswer> | undefined {
  return registry.get(type) as ExercisePlugin<TPrompt, TAnswer> | undefined;
}

export function getAllTypes(): ExerciseType[] {
  return Array.from(registry.keys());
}

export function hasPlugin(type: ExerciseType): boolean {
  return registry.has(type);
}

export function clearRegistry(): void {
  registry.clear();
}
