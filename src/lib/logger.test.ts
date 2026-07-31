import type { IncomingMessage, ServerResponse } from "node:http";
import { Writable } from "node:stream";
import express from "express";
import pino from "pino";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  bindRequestLogContext,
  generateRequestId,
  httpLogger,
  serializeRequest,
  serializeResponse,
} from "./http-logger";
import { loggerOptions } from "./logger";
import {
  getRequestLogContext,
  runWithRequestLogContext,
  updateRequestLogContext,
} from "./request-context";

function createCapturingLogger() {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const testLogger = pino(
    { ...loggerOptions, level: "info", transport: undefined },
    destination,
  );

  return {
    logger: testLogger,
    readLastLog: () => JSON.parse(lines.at(-1)!) as Record<string, unknown>,
  };
}

describe("structured logging", () => {
  it("redacts common secrets at multiple nesting levels", () => {
    const capture = createCapturingLogger();

    capture.logger.info(
      {
        authorization: "Bearer top-secret",
        payload: {
          password: "password-secret",
          session: { accessToken: "access-secret" },
        },
      },
      "redaction test",
    );

    const log = capture.readLastLog();
    expect(log.authorization).toBe("[REDACTED]");
    expect(JSON.stringify(log)).not.toContain("top-secret");
    expect(JSON.stringify(log)).not.toContain("password-secret");
    expect(JSON.stringify(log)).not.toContain("access-secret");
  });

  it("adds request and authenticated-user context to downstream logs", async () => {
    const capture = createCapturingLogger();

    await runWithRequestLogContext(
      { requestId: "86a7f608-17d5-45a3-b68f-d4a01b39b67e" },
      async () => {
        await Promise.resolve();
        updateRequestLogContext({ userId: "user-123", authType: "user" });
        capture.logger.info("context test");
      },
    );

    expect(capture.readLastLog()).toMatchObject({
      requestId: "86a7f608-17d5-45a3-b68f-d4a01b39b67e",
      userId: "user-123",
      authType: "user",
    });
  });

  it("uses a valid supplied request ID and exposes it in the response", () => {
    const suppliedId = "52c018db-e4a7-4ddf-a4be-59e5ad338e05";
    const req = {
      headers: { "x-request-id": suppliedId },
    } as unknown as IncomingMessage;
    const setHeader = vi.fn();
    const res = { setHeader } as unknown as ServerResponse;

    expect(generateRequestId(req, res)).toBe(suppliedId);
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", suppliedId);
  });

  it("replaces an invalid supplied request ID with a UUID", () => {
    const req = {
      headers: { "x-request-id": "attacker-controlled-value" },
    } as unknown as IncomingMessage;
    const setHeader = vi.fn();
    const res = { setHeader } as unknown as ServerResponse;

    const requestId = generateRequestId(req, res);

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(setHeader).toHaveBeenCalledWith("X-Request-Id", requestId);
  });

  it("logs request paths without query strings or headers", () => {
    const req = {
      id: "request-123",
      method: "GET",
      url: "/api/auth/oauth/callback?code=sensitive-code",
      headers: { authorization: "Bearer secret" },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as IncomingMessage;
    const res = { statusCode: 204 } as ServerResponse;

    expect(serializeRequest(req)).toEqual({
      id: "request-123",
      method: "GET",
      path: "/api/auth/oauth/callback",
      remoteAddress: "127.0.0.1",
    });
    expect(serializeResponse(res)).toEqual({ statusCode: 204 });
  });

  it("returns the same request ID that downstream async context receives", async () => {
    const app = express();
    app.use(httpLogger);
    app.use(bindRequestLogContext);
    app.get("/", async (_req, res) => {
      await Promise.resolve();
      res.json(getRequestLogContext());
    });

    const response = await request(app).get("/");

    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.body.requestId).toBe(response.headers["x-request-id"]);
  });
});
