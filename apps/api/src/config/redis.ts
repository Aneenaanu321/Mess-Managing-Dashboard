import IORedis from "ioredis";
import { env } from "./env";

// Lazy connect — apps/api doesn't enqueue BullMQ jobs itself yet (that's
// apps/worker), so this exists solely for the /health/ready reachability
// check. lazyConnect avoids opening a socket at import time for a
// dependency this app doesn't otherwise use.
export const redis = new IORedis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
