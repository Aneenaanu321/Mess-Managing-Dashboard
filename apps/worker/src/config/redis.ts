import IORedis from "ioredis";
import { env } from "./env";

// BullMQ requires maxRetriesPerRequest: null on the connection it's handed.
export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
