/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it } from "bun:test";
import jwt from "jsonwebtoken";
import { checkToken } from "../../src/middlewares/v1/authHandler.js";
import config from "../../src/config/config.js";

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

function makeReq(overrides: Partial<{
	path: string;
	method: string;
	headers: Record<string, string>;
}> = {}) {
	return {
		path: "/api/v1/some-route",
		method: "GET",
		headers: {},
		...overrides,
	} as any;
}

describe("checkToken", () => {
	it("skips auth for POST /api/v1/auth/token", () => {
		const req = makeReq({ path: "/api/v1/auth/token", method: "POST" });
		const res = makeMockRes();
		let called = false;
		checkToken(req, res, () => { called = true; });
		expect(called).toBe(true);
		expect(res.statusCode).toBe(200);
	});

	it("skips auth for POST /api/v1/user", () => {
		const req = makeReq({ path: "/api/v1/user", method: "POST" });
		const res = makeMockRes();
		let called = false;
		checkToken(req, res, () => { called = true; });
		expect(called).toBe(true);
	});

	it("does not skip auth for GET /api/v1/user", () => {
		const req = makeReq({ path: "/api/v1/user", method: "GET" });
		const res = makeMockRes();
		let called = false;
		checkToken(req, res, () => { called = true; });
		expect(called).toBe(false);
		expect(res.statusCode).toBe(401);
	});

	it("returns 401 when no authorization header", () => {
		const req = makeReq({ headers: {} });
		const res = makeMockRes();
		checkToken(req, res, () => {});
		expect(res.statusCode).toBe(401);
		expect(res.body).toMatchObject({ message: expect.stringContaining("No token") });
	});

	it("returns 401 when authorization header has no token part", () => {
		const req = makeReq({ headers: { authorization: "Bearer " } });
		const res = makeMockRes();
		checkToken(req, res, () => {});
		expect(res.statusCode).toBe(401);
	});

	it("returns 403 for invalid token", () => {
		const req = makeReq({ headers: { authorization: "Bearer invalidtoken" } });
		const res = makeMockRes();
		checkToken(req, res, () => {});
		expect(res.statusCode).toBe(403);
		expect(res.body).toMatchObject({ message: expect.stringContaining("Invalid") });
	});

	it("calls next() and sets req.user for valid token", () => {
		const token = jwt.sign({ id: 42 }, config.secret);
		const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
		const res = makeMockRes();
		let called = false;
		checkToken(req, res, () => { called = true; });
		expect(called).toBe(true);
		expect((req as any).user).toBeDefined();
		expect((req as any).user.id).toBe(42);
	});

	it("returns 403 for expired token", async () => {
		const token = jwt.sign({ id: 1 }, config.secret, { expiresIn: 1 });
		await new Promise((r) => setTimeout(r, 1100));
		const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
		const res = makeMockRes();
		checkToken(req, res, () => {});
		expect(res.statusCode).toBe(403);
	});
});
