import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import chatRoutes from "./chat.routes";

const MOCK_REPLY = "Hello! I'm your Aurevo fashion assistant. How can I help you today?";

// Mock the service module so no real Anthropic API calls are made
vi.mock("./chat.service", () => ({
  streamChat: vi.fn(async function* () {
    yield MOCK_REPLY;
  }),
}));

const app = createTestApp(chatRoutes);

// ─── GET /health ──────────────────────────────────────────────────────────────

describe("GET /chat/health", () => {
  it("returns AI service status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ready");
    expect(res.body.data.model).toBeDefined();
  });
});

// ─── POST / ───────────────────────────────────────────────────────────────────

describe("POST /chat", () => {
  it("returns SSE stream with AI response", async () => {
    const res = await request(app)
      .post("/")
      .send({ message: "What products do you have?" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    // SSE response contains data events
    expect(res.text).toContain("data:");
    expect(res.text).toContain("[DONE]");
  });

  it("includes the AI response text in stream", async () => {
    const res = await request(app)
      .post("/")
      .send({ message: "Show me sneakers" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("fashion assistant");
  });

  it("returns 400 for empty message", async () => {
    const res = await request(app).post("/").send({ message: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for message exceeding 2000 chars", async () => {
    const res = await request(app).post("/").send({ message: "a".repeat(2001) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no message body", async () => {
    const res = await request(app).post("/").send({});
    expect(res.status).toBe(400);
  });

  it("accepts optional sessionId", async () => {
    const res = await request(app)
      .post("/")
      .send({ message: "Hello", sessionId: "00000000-0000-0000-0000-000000000001" });
    expect(res.status).toBe(200);
  });

  it("rejects invalid sessionId (not uuid)", async () => {
    const res = await request(app).post("/").send({ message: "Hello", sessionId: "not-a-uuid" });
    expect(res.status).toBe(400);
  });
});
