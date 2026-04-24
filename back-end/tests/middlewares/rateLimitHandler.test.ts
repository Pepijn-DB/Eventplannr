/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock express-rate-limit to return the options object so we can inspect it
vi.mock("express-rate-limit", () => ({
  default: (opts: any) => opts,
}));

import { rateLimiter, authRateLimiter } from "../../src/middlewares/v1/rateLimitHandler.js";

describe("rateLimitHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports rateLimiter with expected configuration and handler works when req.rateLimit present", () => {
    expect(rateLimiter).toBeTruthy();
    // @ts-expect-error
    expect(rateLimiter.windowMs).toBe(15 * 60 * 1000);
    // @ts-expect-error
    expect(rateLimiter.limit).toBe(100);
    // @ts-expect-error
    expect(rateLimiter.message).toHaveProperty("error");
    // @ts-expect-error
    expect(typeof rateLimiter.handler).toBe("function");

    // call handler with a req that has rateLimit.resetTime
    const req: any = { rateLimit: { resetTime: 5000 } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    // @ts-expect-error
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
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    // @ts-expect-error
    rateLimiter.handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    const jsonArg = (res.json as any).mock.calls[0][0];
    expect(jsonArg.retryAfter).toBe(10 + 3600);

    spy.mockRestore();
  });

  it("exports authRateLimiter with expected configuration", () => {
    expect(authRateLimiter).toBeTruthy();
    // @ts-expect-error
    expect(authRateLimiter.windowMs).toBe(10 * 60 * 1000);
    // @ts-expect-error
    expect(authRateLimiter.limit).toBe(5);
    // @ts-expect-error
    expect(authRateLimiter.message).toHaveProperty("error", "Too many authentication attempts");
    // @ts-expect-error
    expect(authRateLimiter.skipSuccessfulRequests).toBe(true);
  });
});

