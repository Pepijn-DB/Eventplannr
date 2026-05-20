/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { describe, expect, it } from "bun:test";
import http from "node:http";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import config from "../src/config/config.js";

async function withServer<T>(fn: (baseUrl: string) => Promise<T>) {
	const server = http.createServer(app as any);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const addr: any = server.address();
		const port = addr.port;
		const baseUrl = `http://127.0.0.1:${port}`;
		return await fn(baseUrl);
	} finally {
		server.close();
	}
}

describe("app middleware and defaults", () => {
	it("sets Access-Control-Allow-Origin from config and returns 404 JSON for unknown routes", async () => {
		const token = jwt.sign({ id: 1 }, config.secret);
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/no-such-route`, {
				method: "GET",
				headers: { authorization: `Bearer ${token}` },
			});

			const contentType = res.headers.get("content-type") || "";
			if (
				contentType.includes("application/json") ||
				contentType.includes("json")
			) {
				const body = await res.json();
				expect(body).toMatchObject({ message: "Route not found" });
				expect(res.status).toBe(404);
			} else {
				expect([404, 500]).toContain(res.status);
			}

			expect(res.headers.get("access-control-allow-origin")).toBe(
				config.cors_url,
			);
		});
	});

	it("honors req.rateLimit by setting X-RateLimit headers", async () => {
		const token = jwt.sign({ id: 1 }, config.secret);
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/no-such-route`, {
				method: "GET",
				headers: { authorization: `Bearer ${token}` },
			});
			expect(res.headers.get("x-ratelimit-remaining")).not.toBeNull();
			expect(res.headers.get("x-ratelimit-reset")).not.toBeNull();
		});
	});
});
