export interface DatabaseContext {
  tenantId?: string;
  factoryId?: string;
  userId?: string;
  requestId?: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

export function createDatabaseContext(values: DatabaseContext = {}): DatabaseContext {
  return {
    tenantId: values.tenantId,
    factoryId: values.factoryId,
    userId: values.userId,
    requestId: values.requestId,
    role: values.role,
    metadata: values.metadata ?? {},
  };
}
