/** Client-side IDs for the `text` primary keys, per PLAN.md §3. */
export function createId(): string {
  return crypto.randomUUID();
}