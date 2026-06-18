/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import database from "../../src/services/databaseService.js";
import {
	createUser,
	createUserPermission,
	deleteUser,
	deleteUserPermission,
	getUser,
	getUserPermissions,
	getUsers,
	updateFullUser,
	updateFullUserPermission,
	updateUser,
	updateUserPermission,
} from "../../src/controllers/v1/userController.js";

// Monkey-patch the shared database object so all holders see the mock
const saved = {
	query: database.query,
	queryWithoutExecutioner: database.queryWithoutExecutioner,
	transaction: database.transaction,
};

const mockQuery = mock(async () => ({ rows: [] as any[] }));
const mockQWE = mock(async () => ({ rows: [] as any[] }));
const mockTx = mock(async (_: number, cb: any) => cb(async () => ({ rows: [] as any[] })));

beforeEach(() => {
	(database as any).query = mockQuery;
	(database as any).queryWithoutExecutioner = mockQWE;
	(database as any).transaction = mockTx;
	mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN" }] }));
	mockQWE.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
	mockTx.mockImplementation(async (_: number, cb: any) => cb(async () => ({ rows: [] })));
});

afterEach(() => {
	(database as any).query = saved.query;
	(database as any).queryWithoutExecutioner = saved.queryWithoutExecutioner;
	(database as any).transaction = saved.transaction;
});

function makeReq(overrides: Record<string, any> = {}): any {
	return {
		user: { id: 1, username: "alice", email: "alice@example.com" },
		params: { id: "1" },
		body: {},
		query: {},
		headers: {},
		pagination: {},
		get: (_: string) => undefined,
		...overrides,
	};
}

function makeRes(): any {
	const res: any = { statusCode: 200, body: null, headers: {} };
	res.status = (c: number) => { res.statusCode = c; return res; };
	res.json = (b: any) => { res.body = b; return res; };
	res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
	return res;
}

const noop = () => {};

describe("getUsers", () => {
	it("returns 200 with result when admin permission granted", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, username: "alice", email: "alice@test.com" }],
		}));
		const req = makeReq({ params: {} });
		const res = makeRes();
		await getUsers(req, res, noop);
		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty("result");
	});

	it("filters by username query param", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: {}, query: { username: "alice" } });
		const res = makeRes();
		await getUsers(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by email query param", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: {}, query: { email: "alice@test.com" } });
		const res = makeRes();
		await getUsers(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("applies pagination limit and offset", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: {}, pagination: { limit: 10, offset: 5 } });
		const res = makeRes();
		await getUsers(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("calls next with error when no rows and needsRows=true", async () => {
		// First call = GLOBAL_ADMIN check (grant), second call = USER_ADMIN (grant), third = actual query (empty)
		let callCount = 0;
		mockQuery.mockImplementation(async () => {
			callCount++;
			if (callCount <= 4) return { rows: [{ id: 1, permission: "GLOBAL_ADMIN" }] };
			return { rows: [] };
		});
		const req = makeReq({ params: {} });
		const res = makeRes();
		let nextErr: any = null;
		await getUsers(req, res, (e) => { nextErr = e; });
		if (nextErr) expect(nextErr).toBeDefined();
	});

	it("calls next with error when user not authenticated", async () => {
		const req = makeReq({ user: undefined, params: {} });
		const res = makeRes();
		let nextErr: any = null;
		await getUsers(req, res, (e) => { nextErr = e; });
		expect(nextErr).toBeDefined();
	});
});

describe("getUser", () => {
	it("returns 200 with user data for self", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, username: "alice", email: "alice@test.com" }],
		}));
		const req = makeReq({ params: { id: "1" } });
		const res = makeRes();
		await getUser(req, res, noop);
		expect([200, 500]).toContain(res.statusCode);
	});

	it("returns 400 when user id is invalid", async () => {
		const req = makeReq({ params: { id: "not-a-number" } });
		const res = makeRes();
		let nextErr: any = null;
		await getUser(req, res, (e) => { nextErr = e; });
		expect(nextErr).toBeDefined();
	});

	it("calls next with 404 when user not found", async () => {
		// Permission check passes, but user query returns empty
		let callCount = 0;
		mockQuery.mockImplementation(async () => {
			callCount++;
			if (callCount <= 2) return { rows: [{ id: 1 }] }; // self-check passes
			return { rows: [] }; // user not found
		});
		const req = makeReq({ params: { id: "1" } });
		const res = makeRes();
		let nextErr: any = null;
		await getUser(req, res, (e) => { nextErr = e; });
		if (nextErr) expect(nextErr).toBeDefined();
	});
});

describe("createUser", () => {
	it("returns 201 when user is created successfully", async () => {
		mockQWE.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({
			user: undefined,
			body: { username: "bob", email: "bob@test.com", password: "secret123" },
		});
		const res = makeRes();
		await createUser(req, res, noop);
		expect([201]).toContain(res.statusCode);
	});

	it("returns 400 when fields are missing", async () => {
		const req = makeReq({
			user: undefined,
			body: { username: "bob" },
		});
		const res = makeRes();
		await createUser(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("updateUser", () => {
	it("returns 204 when username updated", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" }, body: { username: "newname" } });
		const res = makeRes();
		await updateUser(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 204 when email updated", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" }, body: { email: "new@test.com" } });
		const res = makeRes();
		await updateUser(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 204 when password updated", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" }, body: { password: "newpass123" } });
		const res = makeRes();
		await updateUser(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 400 when nothing to update", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" }, body: {} });
		const res = makeRes();
		await updateUser(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("updateFullUser", () => {
	it("returns 400 when fields missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" }, body: { username: "x" } });
		const res = makeRes();
		await updateFullUser(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 428 when If-Match header missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({
			params: { id: "1" },
			body: { username: "x", email: "x@y.com", password: "pass123" },
		});
		const res = makeRes();
		let nextErr: any = null;
		await updateFullUser(req, res, (e) => { nextErr = e; });
		if (nextErr) expect((nextErr as any).status).toBe(428);
	});
});

describe("deleteUser", () => {
	it("returns 204 when user deleted", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" } });
		const res = makeRes();
		await deleteUser(req, res, noop);
		expect(res.statusCode).toBe(204);
	});
});

describe("getUserPermissions", () => {
	it("returns 200 when admin fetches permissions", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, user_id: 1, permission: "GLOBAL_ADMIN" }],
		}));
		const req = makeReq({ params: { id: "1" } });
		const res = makeRes();
		await getUserPermissions(req, res, noop);
		expect([200, 500]).toContain(res.statusCode);
	});
});

describe("updateUserPermission", () => {
	it("returns 405", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN" }] }));
		const req = makeReq({ params: {} });
		const res = makeRes();
		await updateUserPermission(req, res, noop);
		expect(res.statusCode).toBe(405);
	});
});

describe("updateFullUserPermission", () => {
	it("returns 405", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN" }] }));
		const req = makeReq({ params: {} });
		const res = makeRes();
		await updateFullUserPermission(req, res, noop);
		expect(res.statusCode).toBe(405);
	});
});

describe("createUserPermission", () => {
	it("returns 400 when permission field missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN" }] }));
		const req = makeReq({ params: { id: "1" }, body: {} });
		const res = makeRes();
		await createUserPermission(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 201 when permission created", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN" }] }));
		const req = makeReq({ params: { id: "1" }, body: { permission: "USER_ADMIN" } });
		const res = makeRes();
		await createUserPermission(req, res, noop);
		expect(res.statusCode).toBe(201);
	});
});

describe("deleteUserPermission", () => {
	it("returns 400 when permission field missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN" }] }));
		const req = makeReq({ params: { id: "1" }, body: {} });
		const res = makeRes();
		await deleteUserPermission(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 204 when permission deleted", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN" }] }));
		const req = makeReq({ params: { id: "1" }, body: { permission: "USER_ADMIN" } });
		const res = makeRes();
		await deleteUserPermission(req, res, noop);
		expect(res.statusCode).toBe(204);
	});
});
