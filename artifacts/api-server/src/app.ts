import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { syncAllCompetitions, getLastSyncAt } from "./services/sync";
import { notFoundHandler, globalErrorHandler } from "./middlewares/error-handler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);

const SYNC_INTERVAL_MS = 30 * 60 * 1000;

function scheduleSync() {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    logger.warn("FOOTBALL_DATA_API_KEY not set — skipping auto-sync");
    return;
  }

  const doSync = () => {
    const last = getLastSyncAt();
    if (!last || Date.now() - last.getTime() > SYNC_INTERVAL_MS) {
      logger.info("Auto-sync: fetching real fixtures from football-data.org");
      syncAllCompetitions().catch((err) =>
        logger.error({ err }, "Auto-sync failed"),
      );
    }
  };

  setTimeout(doSync, 3000);
  setInterval(doSync, SYNC_INTERVAL_MS);
}

scheduleSync();

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  const staticDir =
    process.env.STATIC_DIR ??
    path.resolve(__dirname, "..", "..", "betpredict", "dist", "public");

  app.use(express.static(staticDir));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(staticDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });

  logger.info({ staticDir }, "Serving static frontend from disk");
}

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
