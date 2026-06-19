/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it } from "bun:test";
import http from "node:http";
import jwt from "jsonwebtoken";
import config from "../../src/config/config.js";
import app from "../../src/app.js";

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
	const server = http.createServer(app as any);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const addr: any = server.address();
		const baseUrl = `http://127.0.0.1:${addr.port}`;
		return await fn(baseUrl);
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.close((err) => (err ? reject(err) : resolve())),
		);
	}
}

describe("rateLimitHandler", () => {
	it("sets X-RateLimit-Remaining header on normal requests", async () => {
		const token = jwt.sign({ id: 1 }, config.secret);
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/no-such-route`, {
				headers: { authorization: `Bearer ${token}` },
			});
			expect(res.headers.get("x-ratelimit-remaining")).not.toBeNull();
		});
	});

	it("sets X-RateLimit-Reset header on normal requests", async () => {
		const token = jwt.sign({ id: 1 }, config.secret);
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/no-such-route`, {
				headers: { authorization: `Bearer ${token}` },
			});
			expect(res.headers.get("x-ratelimit-reset")).not.toBeNull();
		});
	});
});
