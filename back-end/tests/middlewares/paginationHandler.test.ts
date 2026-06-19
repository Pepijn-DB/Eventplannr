/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it } from "bun:test";
import paginationHandler from "../../src/middlewares/v1/paginationHandler.js";

function makeReq(query: Record<string, unknown> = {}) {
	return { query, pagination: undefined } as any;
}

function runMiddleware(query: Record<string, unknown> = {}) {
	const req = makeReq(query);
	let called = false;
	paginationHandler(req, {} as any, () => {
		called = true;
	});
	return { req, called };
}

describe("paginationHandler", () => {
	it("calls next()", () => {
		const { called } = runMiddleware();
		expect(called).toBe(true);
	});

	it("sets empty pagination when no query params", () => {
		const { req } = runMiddleware();
		expect(req.pagination).toEqual({});
	});

	it("parses page and per_page into limit and offset", () => {
		const { req } = runMiddleware({ page: "2", per_page: "10" });
		expect(req.pagination.page).toBe(2);
		expect(req.pagination.per_page).toBe(10);
		expect(req.pagination.limit).toBe(10);
		expect(req.pagination.offset).toBe(10);
	});

	it("parses page=1 with per_page=20 gives offset=0", () => {
		const { req } = runMiddleware({ page: "1", per_page: "20" });
		expect(req.pagination.offset).toBe(0);
		expect(req.pagination.limit).toBe(20);
	});

	it("parses limit directly", () => {
		const { req } = runMiddleware({ limit: "5" });
		expect(req.pagination.limit).toBe(5);
	});

	it("parses offset directly", () => {
		const { req } = runMiddleware({ offset: "15" });
		expect(req.pagination.offset).toBe(15);
	});

	it("ignores non-positive values", () => {
		const { req } = runMiddleware({ page: "-1", per_page: "0" });
		expect(req.pagination.page).toBeUndefined();
		expect(req.pagination.per_page).toBeUndefined();
	});

	it("ignores non-numeric values", () => {
		const { req } = runMiddleware({ page: "abc" });
		expect(req.pagination.page).toBeUndefined();
	});

	it("floors decimal values", () => {
		const { req } = runMiddleware({ limit: "7.9" });
		expect(req.pagination.limit).toBe(7);
	});

	it("uses perPage as alias for per_page", () => {
		const { req } = runMiddleware({ page: "3", perPage: "5" });
		expect(req.pagination.per_page).toBe(5);
		expect(req.pagination.offset).toBe(10);
	});

	it("sets pagination on req", () => {
		const req = makeReq({ page: "1", per_page: "25" });
		paginationHandler(req, {} as any, () => {});
		expect(req.pagination).toBeDefined();
	});
});
