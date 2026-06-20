import express, { Application } from "express";
import { globalErrorHandler } from "../app/middlewares";

/** Creates a minimal test Express app mounting a single router */
export function createTestApp(router: express.Router): Application {
  const app = express();
  app.use(express.json());
  app.use("/", router);
  app.use(globalErrorHandler);
  return app;
}
