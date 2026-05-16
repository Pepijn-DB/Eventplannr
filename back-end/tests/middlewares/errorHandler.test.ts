/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "bun:test";

// we'll spy on fs.promises.appendFile inside the specific test instead of mocking at top-level

import {
	AppError,
	errorHandler,
	getErrors,
} from "../../src/middlewares/errorHandler.js";

describe("errorHandler middleware", () => {
	beforeEach(() => {
		// clear internal list returned by getErrors()
		const arr = getErrors();
		arr.splice(0, arr.length);
	});

	it("AppError sets status and message", () => {
		const e = new AppError("boom", 400);
		expect(e).toBeInstanceOf(Error);
		expect(e.status).toBe(400);
		expect(e.message).toBe("boom");
	});

	it("errorHandler pushes error and responds with status and message", () => {
		const req: any = { path: "/x" };
		const res: any = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		const err = new AppError("uh oh", 418);
		errorHandler(err, req, res);

		expect(res.status).toHaveBeenCalledWith(418);
		expect(res.json).toHaveBeenCalledWith({ message: "uh oh" });

		const arr = getErrors();
		expect(arr.length).toBe(1);
		// @ts-expect-error
		expect(arr[0].err).toBe(err);
		// biome-ignore lint/style/noNonNullAssertion: <Tests know arr[0] exists and is an object with req property>
		const entry0: any = arr[0]!;
		expect(entry0.req).toMatchObject({ path: "/x" });
	});

	it("errorHandler uses defaults when message/status falsy", () => {
		const req: any = { path: "/y" };
		const res: any = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		// simulate a thrown object without message/status
		const fake: any = { message: "", status: undefined };
		errorHandler(fake as any, req, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });

		const arr = getErrors();
		expect(arr.length).toBe(1);
		// @ts-expect-error
		expect(arr[0].err).toBe(fake);
		// biome-ignore lint/style/noNonNullAssertion: <Tests know arr[0] exists and is an object with req property>
		const entry1: any = arr[0]!;
		expect(entry1.req).toMatchObject({ path: "/y" });
	});
});

describe("errorHandler advanced behavior", () => {
	it("stores sanitized headers and returns them via getErrors", async () => {
		vi.resetAllMocks();
		// import fresh module
		const mod = await import("../../src/middlewares/errorHandler.js");
		const { errorHandler, getErrors, AppError } = mod as any;

		// clear internal buffer
		const arr = getErrors();
		arr.splice(0, arr.length);

		const req: any = {
			headers: { a: "v", b: 123, c: { nested: true }, d: undefined },
			path: "/x",
		};
		const res: any = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		errorHandler(new AppError("boom", 418), req, res);

		expect(res.status).toHaveBeenCalledWith(418);
		expect(res.json).toHaveBeenCalledWith({ message: "boom" });

		const out = getErrors();
		expect(out.length).toBe(1);
		expect(out[0].req).toHaveProperty("headers");
		expect(out[0].req.headers).toMatchObject({ a: "v", b: "123" });
		// nested object should not be preserved
		expect(out[0].req.headers).not.toHaveProperty("c");
	});

	it("bounded buffer drops oldest entries when exceeding ERRORS_MAX", async () => {
		const previousErrorsMax = process.env.ERRORS_MAX;
		try {
			vi.resetAllMocks();
			process.env.ERRORS_MAX = "2";
			const mod = await import("../../src/middlewares/errorHandler.js");
			const { errorHandler, getErrors, AppError } = mod as any;
			const arr = getErrors();
			arr.splice(0, arr.length);
			const res: any = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn().mockReturnThis(),
			};
			const req: any = { headers: {}, path: "/p" };
			errorHandler(new AppError("one", 500), req, res);
			errorHandler(new AppError("two", 500), req, res);
			errorHandler(new AppError("three", 500), req, res);
			const out = getErrors();
			expect(out.length).toBe(2);
			expect(out[0].err.message).toBe("two");
			expect(out[1].err.message).toBe("three");
		} finally {
			if (previousErrorsMax === undefined) {
				delete process.env.ERRORS_MAX;
			} else {
				process.env.ERRORS_MAX = previousErrorsMax;
			}
		}
	});

	it("appends to ERRORS_LOG_PATH and swallows write errors", async () => {
		vi.resetAllMocks();
		// spy on fs.promises.appendFile to simulate disk error
		const fs = await import("node:fs");
		const spy = vi
			.spyOn(fs.promises, "appendFile")
			.mockRejectedValue(new Error("disk"));

		process.env.ERRORS_LOG_PATH = "./somewhere.log";
		const mod = await import("../../src/middlewares/errorHandler.js");
		const { errorHandler, getErrors, AppError } = mod as any;

		const arr = getErrors();
		arr.splice(0, arr.length);

		const req: any = { headers: { h: "v" }, path: "/log" };
		const res: any = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		// Should not throw even though appendFile rejects
		errorHandler(new AppError("logme", 501), req, res);

		// appendFile called asynchronously; wait a tick
		await Promise.resolve();
		expect(spy).toHaveBeenCalled();
		// response still sent
		expect(res.status).toHaveBeenCalledWith(501);
		spy.mockRestore();
	});
	it("sanitizes request even when header getter throws", async () => {
		vi.resetAllMocks();
		const mod = await import("../../src/middlewares/errorHandler.js");
		const { errorHandler, getErrors, AppError } = mod as any;

		const arr = getErrors();
		arr.splice(0, arr.length);

		// create header with a value whose toString would throw if coerced
		const badHeaderObj: any = {
			bad: {
				toString() {
					throw new Error("boom-header");
				},
			},
		};

		const req: any = {
			headers: badHeaderObj,
			path: "/h",
			method: "GET",
			url: "/h?x=1",
		};
		const res: any = {
			status: vi.fn().mockReturnThis(),
			json: vi.fn().mockReturnThis(),
		};

		// should not throw
		errorHandler(new AppError("hdr", 499), req, res);

		expect(res.status).toHaveBeenCalledWith(499);
		const out = getErrors();
		expect(out.length).toBe(1);
		expect(out[0].req).toMatchObject({
			path: "/h",
			method: "GET",
			url: "/h?x=1",
		});
		// headers should be undefined because the only header threw
		expect(out[0].req.headers).toBeUndefined();
	});
});
