/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "bun:test";

vi.mock("express-rate-limit", () => ({
	default: (opts: any) => opts,
}));

let authRateLimiter: any;
let rateLimiter: any;

describe("rateLimitHandler", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const mod = await import("../../src/middlewares/v1/rateLimitHandler.js");
		rateLimiter = mod.rateLimiter;
		authRateLimiter = mod.authRateLimiter;
	});

	it("exports rateLimiter with expected configuration and handler works when req.rateLimit present", () => {
		expect(rateLimiter).toBeTruthy();
		expect(rateLimiter.windowMs).toBe(15 * 60 * 1000);
		expect(rateLimiter.limit).toBe(100);
		expect(rateLimiter.message).toHaveProperty("error");
		expect(typeof rateLimiter.handler).toBe("function");

		// call handler with a req that has rateLimit.resetTime
		const req: any = { rateLimit: { resetTime: 5000 } };
		const res: any = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		rateLimiter.handler(req, res);

		expect(res.status).toHaveBeenCalledWith(429);
		expect(res.json).toHaveBeenCalled();
		const jsonArg = (res.json as any).mock.calls[0][0];
		expect(jsonArg).toHaveProperty("retryAfter", Math.round(5000 / 1000));
		expect(jsonArg).toHaveProperty("error");
	});

	it("handler computes retryAfter using Date.getSeconds when req.rateLimit undefined", () => {
		// freeze Date.prototype.getSeconds to control value
		const spy = vi.spyOn(Date.prototype, "getSeconds").mockReturnValue(10);

		const req: any = {};
		const res: any = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		rateLimiter.handler(req, res);

		expect(res.status).toHaveBeenCalledWith(429);
		const jsonArg = (res.json as any).mock.calls[0][0];
		expect(jsonArg.retryAfter).toBe(10 + 3600);

		spy.mockRestore();
	});

	it("exports authRateLimiter with expected configuration", () => {
		expect(authRateLimiter).toBeTruthy();
		expect(authRateLimiter.windowMs).toBe(10 * 60 * 1000);
		expect(authRateLimiter.limit).toBe(5);
		expect(authRateLimiter.message).toHaveProperty(
			"error",
			"Too many authentication attempts",
		);
		expect(authRateLimiter.skipSuccessfulRequests).toBe(true);
	});
});
