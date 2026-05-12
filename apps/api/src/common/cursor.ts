/**
 * Cursor pagination opaca: codifica `{ createdAt, id }` en base64url.
 * El cliente la trata como un blob; el backend la decodifica para
 * usarla en `WHERE (created_at, id) < (cursor.createdAt, cursor.id)`.
 *
 * Patrón replicable a cualquier listado ordenado DESC por
 * `(created_at, id)` con UUID v4 (id rompe empates).
 */

export interface PageCursor {
  createdAt: string; // ISO timestamp
  id: string; // UUID
}

export function encodeCursor(c: PageCursor): string {
  const json = JSON.stringify(c);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined | null): PageCursor | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as PageCursor;
    if (!parsed || typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
