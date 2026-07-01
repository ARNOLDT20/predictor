import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { logger } from "../lib/logger";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found", path: req.path });
};

export const globalErrorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  const status =
    err instanceof Error && "status" in err
      ? (err as NodeJS.ErrnoException & { status?: number }).status ?? 500
      : 500;

  const message =
    err instanceof Error ? err.message : "Internal Server Error";

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : message,
  });
};
