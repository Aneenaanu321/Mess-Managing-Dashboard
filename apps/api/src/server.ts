import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./config/prisma";

const app = createApp();

// Hosting platforms (Render, Railway, Fly) inject PORT; fall back to API_PORT locally.
const port = Number(process.env.PORT) || env.API_PORT;

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`RFIDCore API listening on :${port} [${env.NODE_ENV}]`);
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
