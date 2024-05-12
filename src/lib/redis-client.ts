import { createClient as createKVClient } from "@vercel/kv";

if (!process.env.KV_REST_API_TOKEN || !process.env.KV_REST_API_URL) {
	throw new Error("Missing KV API keys");
}

export const redisClient = createKVClient({
	token: process.env.KV_REST_API_TOKEN,
	url: process.env.KV_REST_API_URL,
	cache: "no-store",
});
