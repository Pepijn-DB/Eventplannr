/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it } from "bun:test";
import {
	AppError,
	errorHandler,
	getErrors,
} from "../../src/middlewares/errorHandler.js";

function makeMockRes() {
	const res: any = {};
	res.statusCode = 200;
	res.body = null;
	res.status = (code: number) => {
		res.statusCode = code;
		return res;
	};
	res.json = (body: unknown) => {
		res.body = body;
		return res;
	};
	return res;
}

function makeMockReq(overrides: Record<string, unknown> = {}) {
	return {
		method: "GET",
		path: "/test",
		url: "/test",
		headers: { "content-type": "application/json" },
		...overrides,
	} as any;
}

describe("AppError", () => {
	it("constructs with message and status", () => {
		const err = new AppError("Not found", 404);
		expect(err.message).toBe("Not found");
		expect(err.status).toBe(404);
		expect(err instanceof Error).toBe(true);
		expect(err instanceof AppError).toBe(true);
	});

	it("defaults status to 500 when not provided", () => {
		const err = new AppError("Oops");
		expect(err.status).toBe(500);
	});
});

describe("errorHandler", () => {
	it("sets response status from AppError.status", () => {
		const err = new AppError("Forbidden", 403);
		const req = makeMockReq();
		const res = makeMockRes();
		const next = () => {};

		errorHandler(err, req, res, next);

		expect(res.statusCode).toBe(403);
		expect(res.body).toMatchObject({ message: "Forbidden" });
	});

	it("defaults to 500 for plain Error", () => {
		const err = new Error("Something went wrong");
		const req = makeMockReq();
		const res = makeMockRes();
		errorHandler(err, req, res, () => {});
		expect(res.statusCode).toBe(500);
		expect(res.body).toMatchObject({ message: "Something went wrong" });
	});

	it("adds entry to error log", () => {
		const before = getErrors().length;
		const err = new AppError("Test log entry", 400);
		const req = makeMockReq();
		const res = makeMockRes();
		errorHandler(err, req, res, () => {});
		expect(getErrors().length).toBeGreaterThan(before);
	});

	it("sanitizes request headers (strips non-string/number values)", () => {
		const err = new AppError("err", 500);
		const req = makeMockReq({
			headers: {
				"content-type": "application/json",
				"x-custom": 42,
			},
		});
		const res = makeMockRes();
		errorHandler(err, req, res, () => {});
		const entry = getErrors()[getErrors().length - 1];
		expect(entry).toBeDefined();
		expect(entry?.req.headers?.["content-type"]).toBe("application/json");
		expect(entry?.req.headers?.["x-custom"]).toBe("42");
	});

	it("handles req with no headers gracefully", () => {
		const err = new AppError("err", 500);
		const req = { method: "GET", path: "/", url: "/" } as any;
		const res = makeMockRes();
		expect(() => errorHandler(err, req, res, () => {})).not.toThrow();
	});
});
