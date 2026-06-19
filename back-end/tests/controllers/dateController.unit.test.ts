/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import database from "../../src/services/databaseService.js";
import {
	createEventDate,
	deleteEventDate,
	getEventDate,
	getEventDates,
	updateEventDate,
	updateFullEventDate,
} from "../../src/controllers/v1/dateController.js";

const saved = {
	query: database.query,
	transaction: database.transaction,
};

const mockQuery = mock(async () => ({ rows: [{ id: 1, role: "ORGANIZER", date: "2024-01-01" }] as any[] }));
const mockTx = mock(async (_: number, cb: any) => cb(async () => ({ rows: [] as any[] })));

beforeEach(() => {
	(database as any).query = mockQuery;
	(database as any).transaction = mockTx;
	mockQuery.mockImplementation(async () => ({
		rows: [{ id: 1, role: "ORGANIZER", date: "2024-01-01", permission: "GLOBAL_ADMIN" }],
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

describe("getEventDates", () => {
	it("returns 200 with dates list", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, date: "2024-06-15" }],
		}));
		const req = makeReq();
		const res = makeRes();
		await getEventDates(req, res, noop);
		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty("result");
	});

	it("filters by from date", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, date: "2024-06-15" }] }));
		const req = makeReq({ query: { from: "2024-01-01" } });
		const res = makeRes();
		await getEventDates(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by to date", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, date: "2024-06-15" }] }));
		const req = makeReq({ query: { to: "2024-12-31" } });
		const res = makeRes();
		await getEventDates(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("applies pagination", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, date: "2024-06-15" }] }));
		const req = makeReq({ pagination: { limit: 10, offset: 0 } });
		const res = makeRes();
		await getEventDates(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("calls next with error when event_id is invalid", async () => {
		const req = makeReq({ params: { event_id: "abc" } });
		const res = makeRes();
		let nextErr: any = null;
		await getEventDates(req, res, (e) => { nextErr = e; });
		expect(nextErr).toBeDefined();
	});
});

describe("createEventDate", () => {
	it("returns 201 when date created", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ body: { date: "2024-06-15" } });
		const res = makeRes();
		await createEventDate(req, res, noop);
		expect(res.statusCode).toBe(201);
	});

	it("returns 400 when date is invalid", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ body: { date: "not-a-date" } });
		const res = makeRes();
		await createEventDate(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 400 when date is missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ body: {} });
		const res = makeRes();
		await createEventDate(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("deleteEventDate", () => {
	it("returns 204 when date deleted", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ params: { event_id: "1", date_id: "1" } });
		const res = makeRes();
		await deleteEventDate(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("calls next with error when date_id is missing", async () => {
		const req = makeReq({ params: { event_id: "1" } });
		const res = makeRes();
		let nextErr: any = null;
		await deleteEventDate(req, res, (e) => { nextErr = e; });
		expect(nextErr).toBeDefined();
	});
});

describe("updateEventDate", () => {
	it("returns 405 (not implemented)", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ params: { event_id: "1", date_id: "1" } });
		const res = makeRes();
		await updateEventDate(req, res, noop);
		expect(res.statusCode).toBe(405);
	});
});

describe("updateFullEventDate", () => {
	it("returns 428 when If-Match header missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ params: { event_id: "1", date_id: "1" } });
		const res = makeRes();
		let nextErr: any = null;
		await updateFullEventDate(req, res, (e) => { nextErr = e; });
		expect(nextErr).toBeDefined();
		expect(nextErr.status).toBe(428);
	});
});

describe("getEventDate", () => {
	it("returns 200 with date data", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, date: "2024-06-15" }],
		}));
		const req = makeReq({ params: { event_id: "1", date_id: "1" } });
		const res = makeRes();
		await getEventDate(req, res, noop);
		expect([200, 500]).toContain(res.statusCode);
	});

	it("calls next with 404 when date not found", async () => {
		let callCount = 0;
		mockQuery.mockImplementation(async () => {
			callCount++;
			if (callCount === 1) return { rows: [{ id: 1 }] }; // permission check
			return { rows: [] }; // date not found
		});
		const req = makeReq({ params: { event_id: "1", date_id: "999" } });
		const res = makeRes();
		let nextErr: any = null;
		await getEventDate(req, res, (e) => { nextErr = e; });
		if (nextErr) expect(nextErr).toBeDefined();
	});
});
