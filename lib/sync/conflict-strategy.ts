export type ConflictValue = {
  localUpdatedAt: string;
  remoteUpdatedAt: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
};

export function resolveLastWriteWins(conflict: ConflictValue) {
  return Date.parse(conflict.localUpdatedAt) >= Date.parse(conflict.remoteUpdatedAt)
    ? conflict.local
    : conflict.remote;
}

export function resolveByField(
  conflict: ConflictValue,
  preferredFields: string[],
) {
  const base = { ...resolveLastWriteWins(conflict) };

  for (const field of preferredFields) {
    if (field in conflict.local) {
      base[field] = conflict.local[field];
    }
  }

  return base;
}
