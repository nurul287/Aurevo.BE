import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { NextFunction, Request, Response } from "express";
import { pinoHttp } from "pino-http";
import { logger } from "./logger";
import { runWithRequestLogContext } from "./request-context";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateRequestId(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const suppliedId = req.headers["x-request-id"];
  const requestId =
    typeof suppliedId === "string" && UUID_PATTERN.test(suppliedId)
      ? suppliedId
      : randomUUID();

  res.setHeader("X-Request-Id", requestId);
  return requestId;
}

export function serializeRequest(req: IncomingMessage) {
  return {
    id: req.id,
    method: req.method,
    path: req.url?.split("?")[0],
    remoteAddress: req.socket.remoteAddress,
  };
}

export function serializeResponse(res: ServerResponse) {
  return { statusCode: res.statusCode };
}

export const httpLogger = pinoHttp({
  logger,
  genReqId: generateRequestId,
  wrapSerializers: false,
  serializers: {
    req: serializeRequest,
    res: serializeResponse,
  },
  customLogLevel(_req, res, err) {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url === "/api/health",
  },
});

export function bindRequestLogContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  runWithRequestLogContext({ requestId: String(req.id) }, next);
}
