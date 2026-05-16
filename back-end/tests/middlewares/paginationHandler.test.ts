// tests/middlewares/paginationHandler.test.ts
/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { describe, expect, it, vi } from "bun:test";
import paginationHandler from "../../src/middlewares/v1/paginationHandler.js";

describe("paginationHandler middleware", () => {
	it("parses page and per_page and derives limit/offset", () => {
		const req: any = { query: { page: "3", per_page: "10" } };
		const res: any = {};
		const next = vi.fn();

		paginationHandler(req, res, next as any);

		expect(next).toHaveBeenCalled();
		expect(req.pagination).toEqual({
			page: 3,
			per_page: 10,
			limit: 10,
			offset: 20,
		});
	});

	it("parses limit and offset when provided", () => {
		const req: any = { query: { limit: "5", offset: "100" } };
		const res: any = {};
		const next = vi.fn();

		paginationHandler(req, res, next as any);

		expect(next).toHaveBeenCalled();
		// implementation sets per_page from limit when per_page missing
		expect(req.pagination).toEqual({ per_page: 5, limit: 5, offset: 100 });
	});

	it("accepts perPage alias and prefers explicit per_page for per_page computation", () => {
		// when per_page present it should be used; perPage should also work when per_page missing
		const req1: any = { query: { perPage: "8" } };
		const req2: any = { query: { per_page: "4", limit: "7" } };
		const res: any = {};
		const next = vi.fn();

		paginationHandler(req1, res, next as any);
		expect(req1.pagination).toEqual({ per_page: 8, limit: 8 });

		paginationHandler(req2, res, next as any);
		// per_page comes from per_page; limit remains the explicit limit
		expect(req2.pagination).toEqual({ per_page: 4, limit: 7 });
	});

	it("ignores non-positive and non-numeric values", () => {
		const req: any = {
			query: { page: "0", per_page: "-1", limit: "not-a-number", offset: "0" },
		};
		const res: any = {};
		const next = vi.fn();

		paginationHandler(req, res, next as any);

		// no valid pagination values should be attached
		expect(next).toHaveBeenCalled();
		expect(req.pagination).toEqual({});
	});

	it("attaches empty object when no query present", () => {
		const req: any = { query: undefined };
		const res: any = {};
		const next = vi.fn();

		paginationHandler(req, res, next as any);

		expect(next).toHaveBeenCalled();
		expect(req.pagination).toEqual({});
	});
});
