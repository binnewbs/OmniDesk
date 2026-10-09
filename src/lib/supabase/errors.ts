/** Raised by repositories; carries the operation name, never the raw driver error into the UI. */
export class RepositoryError extends Error {
  readonly operation: string;

  constructor(operation: string, cause?: unknown) {
    super(`Repository operation failed: ${operation}`);
    this.name = 'RepositoryError';
    this.operation = operation;
    this.cause = cause;
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'AuthRequiredError';
  }
}