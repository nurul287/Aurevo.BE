import express, { Application, Request, Response, NextFunction } from "express";
import { globalErrorHandler } from "../app/middlewares";

/**
 * Creates a minimal test Express app that mounts a single router.
 * Optionally injects req.user so auth middleware is bypassed.
 */
export function createTestApp(
  router: express.Router,
  user?: { id: string; email: string; role: string }
): Application {
  const app = express();
  app.use(express.json());

  if (user) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = user;
      next();
    });
  }

  app.use("/", router);
  app.use(globalErrorHandler);

  return app;
}
