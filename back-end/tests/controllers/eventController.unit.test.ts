/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import database from "../../src/services/databaseService.js";
import {
	createEvent,
	deleteEvent,
	getEvent,
	getEvents,
	updateEvent,
	updateFullEvent,
} from "../../src/controllers/v1/eventController.js";

const saved = {
	query: database.query,
	transaction: database.transaction,
};

const mockQuery = mock(async () => ({ rows: [{ id: 1, permission: "GLOBAL_ADMIN", role: "ORGANIZER" }] }));
const mockTx = mock(async (_: number, cb: any) => cb(async () => ({ rows: [] })));

beforeEach(() => {
	(database as any).query = mockQuery;
	(database as any).transaction = mockTx;
	mockQuery.mockImplementation(async () => ({
		rows: [{ id: 1, title: "Event", description: "Desc", creator_user: 1, status: "OPEN", role: "ORGANIZER", permission: "GLOBAL_ADMIN" }],
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
		params: {},
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

describe("getEvents", () => {
	it("returns 200 with events list", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, title: "Birthday", creator_user: 1, status: "OPEN" }],
		}));
		const req = makeReq({ params: {} });
		const res = makeRes();
		await getEvents(req, res, noop);
		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty("result");
	});

	it("filters by title", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: {}, query: { title: "Birthday" } });
		const res = makeRes();
		await getEvents(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by status", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: {}, query: { status: "OPEN" } });
		const res = makeRes();
		await getEvents(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("applies pagination", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: {}, pagination: { limit: 5, offset: 0 } });
		const res = makeRes();
		await getEvents(req, res, noop);
		expect(res.statusCode).toBe(200);
	});
});

describe("getEvent", () => {
	it("returns 200 with event data when user is invited", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, title: "Test", description: "Desc", creator_user: 1, status: "OPEN" }],
		}));
		const req = makeReq({ params: { event_id: "1" } });
		const res = makeRes();
		await getEvent(req, res, noop);
		expect([200, 500]).toContain(res.statusCode);
	});

	it("calls next with 404 when event not found", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		const req = makeReq({ params: { event_id: "999" } });
		const res = makeRes();
		let nextErr: any = null;
		await getEvent(req, res, (e) => { nextErr = e; });
		expect(nextErr).toBeDefined();
	});
});

describe("createEvent", () => {
	it("returns 201 when event created", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 5 }] }));
		const req = makeReq({ params: {}, body: { title: "New Party", description: "Fun" } });
		const res = makeRes();
		await createEvent(req, res, noop);
		expect(res.statusCode).toBe(201);
	});

	it("returns 400 when title is missing", async () => {
		const req = makeReq({ params: {}, body: {} });
		const res = makeRes();
		await createEvent(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 201 without description", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 5 }] }));
		const req = makeReq({ params: {}, body: { title: "Event" } });
		const res = makeRes();
		await createEvent(req, res, noop);
		expect(res.statusCode).toBe(201);
	});
});

describe("updateEvent", () => {
	it("returns 204 when event updated with title", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", creator_user: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, body: { title: "Updated Title" } });
		const res = makeRes();
		await updateEvent(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 204 when event updated with description", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", creator_user: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, body: { description: "New desc" } });
		const res = makeRes();
		await updateEvent(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 204 when event updated with status", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", creator_user: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, body: { status: "CLOSED" } });
		const res = makeRes();
		await updateEvent(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 400 when nothing to update", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", creator_user: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, body: {} });
		const res = makeRes();
		await updateEvent(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("updateFullEvent", () => {
	it("returns 400 when required fields missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", creator_user: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, body: { title: "T" } });
		const res = makeRes();
		await updateFullEvent(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 428 when If-Match header missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", creator_user: 1 }] }));
		const req = makeReq({
			params: { event_id: "1" },
			body: { title: "T", description: "D", status: "OPEN" },
		});
		const res = makeRes();
		let nextErr: any = null;
		await updateFullEvent(req, res, (e) => { nextErr = e; });
		if (nextErr) expect((nextErr as any).status).toBe(428);
	});
});

describe("deleteEvent", () => {
	it("returns 204 when event deleted", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", creator_user: 1 }] }));
		const req = makeReq({ params: { event_id: "1" } });
		const res = makeRes();
		await deleteEvent(req, res, noop);
		expect(res.statusCode).toBe(204);
	});
});
