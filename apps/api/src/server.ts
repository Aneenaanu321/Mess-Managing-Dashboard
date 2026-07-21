import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./config/prisma";

const app = createApp();

const server = app.listen(env.API_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RFIDCore API listening on :${env.API_PORT} [${env.NODE_ENV}]`);
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
