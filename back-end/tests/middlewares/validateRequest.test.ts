/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it } from "bun:test";
import * as z from "zod";
import {
	validateBody,
	validateQuery,
} from "../../src/middlewares/validateRequest.js";

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

describe("validateQuery", () => {
	const schema = z.object({ page: z.coerce.number().optional() });

	it("calls next() when query matches schema", () => {
		const req: any = { query: { page: "1" } };
		const res = makeMockRes();
		let called = false;
		validateQuery(schema)(req, res, () => {
			called = true;
		});
		expect(called).toBe(true);
	});

	it("assigns parsed data to req.query", () => {
		const req: any = { query: { page: "3" } };
		const res = makeMockRes();
		validateQuery(schema)(req, res, () => {});
		expect(req.query.page).toBe(3);
	});

	it("returns 400 when query fails validation", () => {
		const strictSchema = z.object({ page: z.number() });
		const req: any = { query: { page: "not-a-number" } };
		const res = makeMockRes();
		let called = false;
		validateQuery(strictSchema)(req, res, () => {
			called = true;
		});
		expect(called).toBe(false);
		expect(res.statusCode).toBe(400);
		expect(res.body).toHaveProperty("message");
		expect(res.body).toHaveProperty("errors");
	});

	it("calls next() for empty query with optional fields", () => {
		const req: any = { query: {} };
		const res = makeMockRes();
		let called = false;
		validateQuery(schema)(req, res, () => {
			called = true;
		});
		expect(called).toBe(true);
	});
});

describe("validateBody", () => {
	const schema = z.object({ name: z.string().min(1) });

	it("calls next() when body matches schema", () => {
		const req: any = { body: { name: "Alice" } };
		const res = makeMockRes();
		let called = false;
		validateBody(schema)(req, res, () => {
			called = true;
		});
		expect(called).toBe(true);
	});

	it("assigns parsed data to req.body", () => {
		const req: any = { body: { name: "Bob", extra: "ignored" } };
		const res = makeMockRes();
		validateBody(schema)(req, res, () => {});
		expect(req.body.name).toBe("Bob");
	});

	it("returns 400 when body fails validation", () => {
		const req: any = { body: {} };
		const res = makeMockRes();
		let called = false;
		validateBody(schema)(req, res, () => {
			called = true;
		});
		expect(called).toBe(false);
		expect(res.statusCode).toBe(400);
		expect(res.body).toHaveProperty("message");
	});

	it("returns 400 for empty string value that fails min(1)", () => {
		const req: any = { body: { name: "" } };
		const res = makeMockRes();
		validateBody(schema)(req, res, () => {});
		expect(res.statusCode).toBe(400);
	});
});
