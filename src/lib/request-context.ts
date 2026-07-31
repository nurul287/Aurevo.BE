import { AsyncLocalStorage } from "node:async_hooks";

export type RequestAuthType = "user" | "guest";

export interface RequestLogContext {
  requestId: string;
  userId?: string;
  authType?: RequestAuthType;
}

const requestLogContext = new AsyncLocalStorage<RequestLogContext>();

export function runWithRequestLogContext<T>(
  context: RequestLogContext,
  callback: () => T,
): T {
  return requestLogContext.run(context, callback);
}

export function updateRequestLogContext(
  context: Partial<Omit<RequestLogContext, "requestId">>,
): void {
  const activeContext = requestLogContext.getStore();
  if (activeContext) Object.assign(activeContext, context);
}

export function getRequestLogContext(): RequestLogContext | undefined {
  return requestLogContext.getStore();
}
