import { z } from "zod";

// ─── ULID Pattern ────────────────────────────────────────────────────────────
// 26-char alphanumeric ULID: 0123456789ABCDEFGHJKMNPQRSTVWXYZ
export const ulidPattern = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i;

export const ulid = z.string().regex(ulidPattern, "Must be a valid ULID");

export const optionalUlid = ulid.optional();

// ─── Pagination ──────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 1;
      return isNaN(n) || n < 1 ? 1 : n;
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 20;
      return isNaN(n) || n < 1 ? 20 : Math.min(n, 100);
    }),
});

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

export const sortSchema = z.object({
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ─── Date Helpers ────────────────────────────────────────────────────────────

export const isoDate = z.string().datetime({ offset: true });

export const isoDateOptional = isoDate.optional();

// ─── Common Query Params ─────────────────────────────────────────────────────

export const listQuerySchema = paginationSchema.merge(sortSchema);
