export class AppError extends Error {
  constructor(message: string, params: Record<string, unknown>) {
    super(`${message} ${JSON.stringify(params)}`);
  }
}
