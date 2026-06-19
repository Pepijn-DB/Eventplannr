/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import database from "../../src/services/databaseService.js";
import { getToken } from "../../src/controllers/v1/authController.js";
import Config from "../../src/config/config.js";

const saved = {
	queryWithoutExecutioner: database.queryWithoutExecutioner,
};

const mockQWE = mock(async () => ({
	rows: [{ id: 1, username: "alice", email: "alice@example.com", password_hash: "" }],
}));

beforeEach(() => {
	(database as any).queryWithoutExecutioner = mockQWE;
	mockQWE.mockImplementation(async () => ({
		rows: [{ id: 1, username: "alice", email: "alice@example.com", password_hash: "" }],
	}));
});

afterEach(() => {
	(database as any).queryWithoutExecutioner = saved.queryWithoutExecutioner;
});

function makeReq(overrides: Record<string, any> = {}): any {
	return {
		body: { email: "alice@example.com", password: "secret" },
		rateLimit: { remaining: 5 },
		...overrides,
	};
}

function makeRes(): any {
	const res: any = { statusCode: 200, body: null };
	res.status = (c: number) => { res.statusCode = c; return res; };
	res.json = (b: any) => { res.body = b; return res; };
	return res;
}

const noop = () => {};

describe("getToken", () => {
	it("returns 400 with 'Missing body' when body is null", async () => {
		const req = makeReq({ body: null });
		const res = makeRes();
		await getToken(req, res, noop);
		expect(res.statusCode).toBe(400);
		expect(res.body.message).toBe("Missing body");
	});

	it("does not return 'Missing body' when a valid body is present", async () => {
		const req = makeReq({ body: { email: "alice@example.com", password: "secret" } });
		const res = makeRes();
		await getToken(req, res, noop);
		expect(res.body?.message).not.toBe("Missing body");
	});

	it("returns 400 with remainingAttempts from rateLimit when body is missing fields", async () => {
		const req = makeReq({ body: {}, rateLimit: { remaining: 3 } });
		const res = makeRes();
		await getToken(req, res, noop);
		expect(res.statusCode).toBe(400);
		expect(res.body.remainingAttempts).toBe("3");
	});

	it("uses 'unknown remaining attempts' when rateLimit is not set", async () => {
		const req = makeReq({ body: {}, rateLimit: undefined });
		const res = makeRes();
		await getToken(req, res, noop);
		expect(res.statusCode).toBe(400);
		expect(res.body.remainingAttempts).toBe("unknown remaining attempts");
	});

	it("returns 400 when body is empty object — missing email and password", async () => {
		const req = makeReq({ body: {} });
		const res = makeRes();
		await getToken(req, res, noop);
		expect(res.statusCode).toBe(400);
		expect(res.body.message).toBe("Missing email or password");
	});

	it("calls next with 500 when Config.secret is null", async () => {
		const originalSecret = Config.secret;
		Config.secret = "null";
		const req = makeReq({ body: { email: "a@b.com", password: "x" } });
		const res = makeRes();
		let nextErr: any = null;
		await getToken(req, res, (e) => { nextErr = e; });
		Config.secret = originalSecret;
		expect(nextErr).not.toBeNull();
		expect(nextErr.status).toBe(500);
	});
});
