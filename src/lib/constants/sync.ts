/**
 * lib/constants/sync.ts
 *
 * Shared constants for the offline sync system.
 * Import from here instead of re-defining in each module.
 */

/** Maximum delay between sync retries: 1 hour. */
export const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

/** Base delay for the first retry: 30 seconds. */
export const BASE_RETRY_DELAY_MS = 30_000;
