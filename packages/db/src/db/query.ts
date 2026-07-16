export interface QueryState {
  page: number;
  pageSize: number;
  offset: number;
  sortBy?: string;
  sortOrder: "asc" | "desc";
  tenantId?: string;
  factoryId?: string;
  includeDeleted: boolean;
  search?: string;
  filters?: Record<string, unknown>;
}

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  tenantId?: string;
  factoryId?: string;
  includeDeleted?: boolean;
  search?: string;
  filters?: Record<string, unknown>;
}

export const defaultQueryState: QueryState = {
  page: 1,
  pageSize: 50,
  offset: 0,
  sortOrder: "asc",
  includeDeleted: false,
};

export function createQueryState(options: QueryOptions = {}): QueryState {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? defaultQueryState.pageSize);

  return {
    ...defaultQueryState,
    ...options,
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function applySoftDeleteFilter(state: QueryState): Record<string, unknown> {
  return state.includeDeleted ? {} : { deletedAt: null };
}

export function buildQueryFilters(state: QueryState): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    ...state.filters,
    ...(state.tenantId ? { tenantId: state.tenantId } : {}),
    ...(state.factoryId ? { factoryId: state.factoryId } : {}),
  };

  if (!state.includeDeleted) {
    filters.deletedAt = null;
  }

  if (state.search) {
    filters.search = state.search;
  }

  return filters;
}
