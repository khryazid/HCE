export function normalizeCommaValues(input: string) {
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
