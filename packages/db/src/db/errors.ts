export class DatabaseInfrastructureError extends Error {
  constructor(message: string, public readonly code = "DB_INFRA_ERROR") {
    super(message);
    this.name = "DatabaseInfrastructureError";
  }
}

export class UniqueConstraintDatabaseError extends DatabaseInfrastructureError {
  constructor(message: string) {
    super(message, "23505");
    this.name = "UniqueConstraintDatabaseError";
  }
}

export class ForeignKeyDatabaseError extends DatabaseInfrastructureError {
  constructor(message: string) {
    super(message, "23503");
    this.name = "ForeignKeyDatabaseError";
  }
}

export class CheckConstraintDatabaseError extends DatabaseInfrastructureError {
  constructor(message: string) {
    super(message, "23514");
    this.name = "CheckConstraintDatabaseError";
  }
}

export class TransactionDatabaseError extends DatabaseInfrastructureError {
  constructor(message: string) {
    super(message, "40001");
    this.name = "TransactionDatabaseError";
  }
}

export class ConnectionDatabaseError extends DatabaseInfrastructureError {
  constructor(message: string) {
    super(message, "08006");
    this.name = "ConnectionDatabaseError";
  }
}

export class TimeoutDatabaseError extends DatabaseInfrastructureError {
  constructor(message: string) {
    super(message, "57014");
    this.name = "TimeoutDatabaseError";
  }
}

export class ValidationDatabaseError extends DatabaseInfrastructureError {
  constructor(message: string) {
    super(message, "22000");
    this.name = "ValidationDatabaseError";
  }
}

export function mapDatabaseError(error: { code?: string; message?: string } | Error): DatabaseInfrastructureError {
  const code = error instanceof Error ? undefined : error.code;
  const message = error instanceof Error ? error.message : error.message ?? "database error";

  switch (code) {
    case "23505":
      return new UniqueConstraintDatabaseError(message);
    case "23503":
      return new ForeignKeyDatabaseError(message);
    case "23514":
      return new CheckConstraintDatabaseError(message);
    case "40001":
      return new TransactionDatabaseError(message);
    case "08006":
      return new ConnectionDatabaseError(message);
    case "57014":
      return new TimeoutDatabaseError(message);
    default:
      return new ValidationDatabaseError(message);
  }
}
