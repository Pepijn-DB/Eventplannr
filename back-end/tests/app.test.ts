/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { describe, it, expect, vi } from "vitest";
// Mock out external middlewares and routers so the app's inline middlewares
// (CORS and rate-limit header logic, 404 handler) can be exercised without
// invoking complex third-party behavior.
vi.mock("../src/middlewares/v1/authHandler.js", () => ({
  checkToken: (req: any, res: any, next: any) => next(),
}));
vi.mock("../src/middlewares/v1/rateLimitHandler.js", () => ({
  rateLimiter: (req: any, res: any, next: any) => next(),
  authRateLimiter: (req: any, res: any, next: any) => next(),
}));
vi.mock("../src/middlewares/errorHandler.js", () => ({
  errorHandler: (err: any, req: any, res: any, next: any) => next(),
  AppError: class AppError extends Error { constructor(m: any, public status = 500) { super(m); } },
}));
vi.mock("../src/routes/v1/adminRoutes.js", () => ({ default: (req: any, res: any, next: any) => next() }));
vi.mock("../src/routes/v1/authRoutes.js", () => ({ default: (req: any, res: any, next: any) => next() }));
vi.mock("../src/routes/v1/eventRoutes.js", () => ({ default: (req: any, res: any, next: any) => next() }));
vi.mock("../src/routes/v1/locationRoutes.js", () => ({ default: (req: any, res: any, next: any) => next() }));
vi.mock("../src/routes/v1/responseRoutes.js", () => ({ default: (req: any, res: any, next: any) => next() }));
vi.mock("../src/routes/v1/userRoutes.js", () => ({ default: (req: any, res: any, next: any) => next() }));

import app from "../src/app.js";
import config from "../src/config/config.js";

describe("app module middleware registration", () => {
  it("sets CORS header in the chain when a request is handled", async () => {
	const req: any = { method: "GET", url: "/non-existing" };
	const res: any = {
	  setHeader: vi.fn(),
	  status: vi.fn().mockReturnThis(),
	  json: vi.fn((body: any) => {
		// return a resolved promise so the test can await
		return body;
	  }),
	};

	// call app as a handler; the 404 middleware will call res.json synchronously
	await new Promise<void>((resolve) => {
	  res.json = vi.fn((body: any) => {
		// assert CORS header was set before 404 handler runs
		expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", config.cors_url);
		resolve();
		return body;
	  });

	  // call the express app with minimal req/res
	  (app as any)(req, res, () => {});
	});
  });

  it("sets rate limit headers when req.rateLimit present and not when absent", async () => {
	// when present
	const req1: any = { method: "GET", url: "/non-existing", rateLimit: { remaining: 99, resetTime: 42 } };
	const res1: any = {
	  setHeader: vi.fn(),
	  status: vi.fn().mockReturnThis(),
	  json: vi.fn((b: any) => b),
	};

	await new Promise<void>((resolve) => {
	  res1.json = vi.fn((body: any) => {
		expect(res1.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", 99);
		expect(res1.setHeader).toHaveBeenCalledWith("X-RateLimit-Reset", 42);
		resolve();
		return body;
	  });
	  (app as any)(req1, res1, () => {});
	});

	// when absent
	const req2: any = { method: "GET", url: "/non-existing" };
	const res2: any = {
	  setHeader: vi.fn(),
	  status: vi.fn().mockReturnThis(),
	  json: vi.fn((b: any) => b),
	};

	await new Promise<void>((resolve) => {
	  res2.json = vi.fn((body: any) => {
		expect(res2.setHeader).not.toHaveBeenCalledWith("X-RateLimit-Remaining", expect.anything());
		expect(res2.setHeader).not.toHaveBeenCalledWith("X-RateLimit-Reset", expect.anything());
		resolve();
		return body;
	  });
	  (app as any)(req2, res2, () => {});
	});
  });

  it("404 handler returns JSON message 'Route not found' and status 404", async () => {
	const req: any = { method: "GET", url: "/still-not-found" };
	const res: any = {
	  setHeader: vi.fn(),
	  status: vi.fn().mockReturnThis(),
	  json: vi.fn((body: any) => body),
	};

	await new Promise<void>((resolve) => {
	  res.json = vi.fn((body: any) => {
		expect(res.status).toHaveBeenCalledWith(404);
		expect(body).toEqual({ message: "Route not found" });
		resolve();
		return body;
	  });
	  (app as any)(req, res, () => {});
	});
  });
});

