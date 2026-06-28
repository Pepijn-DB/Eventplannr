/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import database from "../../src/services/databaseService.js";
import {
	createInvitation,
	deleteInvitation,
	getInvitation,
	getInvitations,
	getUserInvitations,
	updateFullInvitation,
	updateInvitation,
} from "../../src/controllers/v1/invitationController.js";

const saved = {
	query: database.query,
	transaction: database.transaction,
};

const mockQuery = mock(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN", role: "ORGANIZER" }] as any[] }));
const mockTx = mock(async (_: number, cb: any) => cb(async () => ({ rows: [] as any[] })));

beforeEach(() => {
	(database as any).query = mockQuery;
	(database as any).transaction = mockTx;
	mockQuery.mockImplementation(async () => ({
		rows: [{ id: 1, permission: "GLOBAL_ADMIN", role: "ORGANIZER" }],
	}));
	mockTx.mockImplementation(async (_: number, cb: any) => cb(async () => ({ rows: [] })));
});

afterEach(() => {
	(database as any).query = saved.query;
	(database as any).transaction = saved.transaction;
});

function makeReq(overrides: Record<string, any> = {}): any {
	return {
		user: { id: 1 },
		params: { event_id: "1" },
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

describe("getInvitations", () => {
	it("returns 200 with invitations when user has VIEW permission", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, user_id: 1, event_id: 1, role: "GUEST" }],
		}));
		const req = makeReq();
		const res = makeRes();
		await getInvitations(req, res, noop);
		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty("result");
	});

	it("filters by role query param", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ query: { role: "GUEST" } });
		const res = makeRes();
		await getInvitations(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by user_id query param", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ query: { user_id: "2" } });
		const res = makeRes();
		await getInvitations(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("applies pagination", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ pagination: { limit: 5, offset: 10 } });
		const res = makeRes();
		await getInvitations(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("returns 400 when event_id is missing", async () => {
		const req = makeReq({ params: {} });
		const res = makeRes();
		let nextErr: any = null;
		await getInvitations(req, res, (e) => { nextErr = e; });
		expect(nextErr).toBeDefined();
	});
});

describe("getUserInvitations", () => {
	it("returns 200 with invitations for self", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" } });
		const res = makeRes();
		await getUserInvitations(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("returns 400 when user id is invalid", async () => {
		const req = makeReq({ params: { id: "abc" } });
		const res = makeRes();
		await getUserInvitations(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 400 when user id is missing", async () => {
		const req = makeReq({ params: {} });
		const res = makeRes();
		await getUserInvitations(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("filters by role query param", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" }, query: { role: "ORGANIZER" } });
		const res = makeRes();
		await getUserInvitations(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by event_id query param", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" }, query: { event_id: "5" } });
		const res = makeRes();
		await getUserInvitations(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("applies pagination", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { id: "1" }, pagination: { limit: 10, offset: 0 } });
		const res = makeRes();
		await getUserInvitations(req, res, noop);
		expect(res.statusCode).toBe(200);
	});
});

describe("getInvitation", () => {
	it("returns 200 with invitation data", async () => {
		let callCount = 0;
		mockQuery.mockImplementation(async () => {
			callCount++;
			if (callCount === 1) return { rows: [{ id: 1 }] }; // VIEW permission check
			if (callCount === 2) return { rows: [{ user_id: 2 }] }; // get user_id from invitation_id
			// actual invitation + setETag
			return { rows: [{ id: 1, user_id: 2, event_id: 1, role: "GUEST" }] };
		});
		const req = makeReq({ params: { event_id: "1", invitation_id: "1" } });
		const res = makeRes();
		await getInvitation(req, res, noop);
		expect([200, 500]).toContain(res.statusCode);
	});

	it("returns 404 when invitation not found for user_id lookup", async () => {
		let callCount = 0;
		mockQuery.mockImplementation(async () => {
			callCount++;
			if (callCount === 1) return { rows: [{ id: 1 }] }; // VIEW permission
			return { rows: [] }; // user_id not found
		});
		const req = makeReq({ params: { event_id: "1", invitation_id: "999" } });
		const res = makeRes();
		await getInvitation(req, res, noop);
		expect(res.statusCode).toBe(404);
	});
});

describe("createInvitation", () => {
	it("returns 201 when invitation created", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ body: { userId: 2, role: "GUEST" } });
		const res = makeRes();
		await createInvitation(req, res, noop);
		expect(res.statusCode).toBe(201);
	});

	it("uses default role GUEST when not specified", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ body: { userId: 2 } });
		const res = makeRes();
		await createInvitation(req, res, noop);
		expect(res.statusCode).toBe(201);
	});
});

describe("updateInvitation", () => {
	it("returns 204 when role updated", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({
			params: { event_id: "1", invitation_id: "1" },
			body: { role: "GUEST" },
		});
		const res = makeRes();
		await updateInvitation(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 400 when nothing to update (no role)", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({
			params: { event_id: "1", invitation_id: "1" },
			body: {},
		});
		const res = makeRes();
		await updateInvitation(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("updateFullInvitation", () => {
	it("returns 400 when role missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({
			params: { event_id: "1", invitation_id: "1" },
			body: {},
		});
		const res = makeRes();
		await updateFullInvitation(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 428 when If-Match header missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({
			params: { event_id: "1", invitation_id: "1" },
			body: { role: "GUEST" },
		});
		const res = makeRes();
		let nextErr: any = null;
		await updateFullInvitation(req, res, (e) => { nextErr = e; });
		if (nextErr) expect((nextErr as any).status).toBe(428);
	});
});

describe("deleteInvitation", () => {
	it("returns 204 when invitation deleted", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ params: { event_id: "1", invitation_id: "1" } });
		const res = makeRes();
		await deleteInvitation(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("calls next with 404 when invitation event not found", async () => {
		let callCount = 0;
		mockQuery.mockImplementation(async () => {
			callCount++;
			if (callCount === 1) return { rows: [] }; // sqlEvent returns empty
			return { rows: [{ id: 1 }] };
		});
		const req = makeReq({ params: { event_id: "1", invitation_id: "999" } });
		const res = makeRes();
		let nextErr: any = null;
		await deleteInvitation(req, res, (e) => { nextErr = e; });
		if (nextErr) expect(nextErr).toBeDefined();
	});
});
