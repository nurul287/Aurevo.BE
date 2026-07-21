import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../test/app";
import chatInternalRoutes from "./chat.internal.routes";
import { config } from "../../config";

const app = createTestApp(chatInternalRoutes);

describe("POST /internal/chat/cleanup", () => {
  it("rejects a request with no internal task token", async () => {
    const res = await request(app).post("/cleanup");
    expect(res.status).toBe(401);
  });

  it("rejects a request with the wrong token", async () => {
    const res = await request(app).post("/cleanup").set("x-internal-task-token", "wrong-token");
    expect(res.status).toBe(401);
  });

  it("accepts a request with the correct token", async () => {
    const res = await request(app).post("/cleanup").set("x-internal-task-token", config.INTERNAL_TASK_TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.data.deletedCount).toBeDefined();
    expect(res.body.data.deletedMetrics).toBeDefined();
  });
});
