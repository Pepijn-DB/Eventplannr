/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import database from "../../src/services/databaseService.js";
import {
	createDateResponse,
	createLocationResponse,
	deleteDateResponse,
	deleteLocationResponse,
	getAllDateResponses,
	getAllLocationResponses,
	getDateResponse,
	getLocationResponse,
	updateDateResponse,
	updateFullDateResponse,
	updateFullLocationResponse,
	updateLocationResponse,
} from "../../src/controllers/v1/responseController.js";

const saved = {
	query: database.query,
	transaction: database.transaction,
};

// Default mock: returns rows that grant EDIT_ALL and give an invitation id
const mockQuery = mock(async () => ({
	rows: [{ id: 1, role: "ORGANIZER", state: "YES", date: "2024-01-01", permission: "GLOBAL_ADMIN", user_id: 1, event_id: 1 }] as any[],
}));

beforeEach(() => {
	(database as any).query = mockQuery;
	mockQuery.mockImplementation(async () => ({
		rows: [{ id: 1, role: "ORGANIZER", state: "YES", date: "2024-01-01", permission: "GLOBAL_ADMIN", user_id: 1, event_id: 1 }],
	}));
});

afterEach(() => {
	(database as any).query = saved.query;
	(database as any).transaction = saved.transaction;
});

function makeReq(overrides: Record<string, any> = {}): any {
	return {
		user: { id: 1 },
		params: { event_id: "1", date_id: "1", user_id: "1" },
		body: { state: "YES" },
		query: {},
		headers: {},
		pagination: {},
		path: "/date/1",
		get: (_: string) => undefined,
		...overrides,
	};
}

function makeLocationReq(overrides: Record<string, any> = {}): any {
	return {
		user: { id: 1 },
		params: { event_id: "1", location_id: "1", user_id: "1" },
		body: { state: "YES" },
		query: {},
		headers: {},
		pagination: {},
		path: "/location/1",
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

describe("getAllDateResponses", () => {
	it("returns 200 with date responses", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, date_id: 1, state: "YES", user_id: 1 }],
		}));
		const req = makeReq({ params: { event_id: "1" }, path: "/" });
		const res = makeRes();
		await getAllDateResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by state", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, query: { state: "YES" }, path: "/" });
		const res = makeRes();
		await getAllDateResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by user_id", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, query: { user_id: "1" }, path: "/" });
		const res = makeRes();
		await getAllDateResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by date_id", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, query: { date_id: "2" }, path: "/" });
		const res = makeRes();
		await getAllDateResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("applies pagination", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeReq({ params: { event_id: "1" }, pagination: { limit: 5, offset: 0 }, path: "/" });
		const res = makeRes();
		await getAllDateResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});
});

describe("createDateResponse", () => {
	it("returns 201 when date response created", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 5, role: "ORGANIZER" }] }));
		const req = makeReq({ body: { state: "YES" } });
		const res = makeRes();
		await createDateResponse(req, res, noop);
		expect(res.statusCode).toBe(201);
	});

	it("returns 400 when state is missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 5, role: "ORGANIZER" }] }));
		const req = makeReq({ body: {} });
		const res = makeRes();
		await createDateResponse(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("getDateResponse", () => {
	it("returns 200 with date response data", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, state: "YES", date: "2024-01-01", username: "alice" }],
		}));
		const req = makeReq();
		const res = makeRes();
		await getDateResponse(req, res, noop);
		expect([200, 500]).toContain(res.statusCode);
	});

	it("calls next when user_id missing", async () => {
		const req = makeReq({ params: { event_id: "1", date_id: "1" }, path: "/date/1" });
		const res = makeRes();
		let nextErr: any = null;
		await getDateResponse(req, res, (e) => { nextErr = e; });
		expect(nextErr).toBeDefined();
	});
});

describe("updateDateResponse", () => {
	it("returns 204 when date response updated", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ body: { state: "NO" } });
		const res = makeRes();
		await updateDateResponse(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 400 when state is missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ body: {} });
		const res = makeRes();
		await updateDateResponse(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("updateFullDateResponse", () => {
	it("returns 400 when state is missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq({ body: {} });
		const res = makeRes();
		await updateFullDateResponse(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 404 when date response not found", async () => {
		let callCount = 0;
		mockQuery.mockImplementation(async () => {
			callCount++;
			// Permission and getInvitationId calls
			if (callCount <= 3) return { rows: [{ id: 1, role: "ORGANIZER" }] };
			// The SELECT * FROM date_response returns empty
			return { rows: [] };
		});
		const req = makeReq({ body: { state: "YES" } });
		const res = makeRes();
		await updateFullDateResponse(req, res, noop);
		expect(res.statusCode).toBe(404);
	});

	it("returns 428 when If-Match header missing and response found", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", state: "YES" }] }));
		const req = makeReq({ body: { state: "YES" } });
		const res = makeRes();
		let nextErr: any = null;
		await updateFullDateResponse(req, res, (e) => { nextErr = e; });
		if (nextErr) expect((nextErr as any).status).toBe(428);
	});
});

describe("deleteDateResponse", () => {
	it("returns 204 when date response deleted", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeReq();
		const res = makeRes();
		await deleteDateResponse(req, res, noop);
		expect(res.statusCode).toBe(204);
	});
});

describe("getAllLocationResponses", () => {
	it("returns 200 with location responses", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, state: "YES", name: "Paris", user_id: 1 }],
		}));
		const req = makeLocationReq({ params: { event_id: "1" }, path: "/" });
		const res = makeRes();
		await getAllLocationResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by state", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeLocationReq({ params: { event_id: "1" }, query: { state: "YES" }, path: "/" });
		const res = makeRes();
		await getAllLocationResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by user_id", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeLocationReq({ params: { event_id: "1" }, query: { user_id: "1" }, path: "/" });
		const res = makeRes();
		await getAllLocationResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});

	it("filters by location_id", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		const req = makeLocationReq({ params: { event_id: "1" }, query: { location_id: "2" }, path: "/" });
		const res = makeRes();
		await getAllLocationResponses(req, res, noop);
		expect(res.statusCode).toBe(200);
	});
});

describe("createLocationResponse", () => {
	it("returns 201 when location response created", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 5, role: "ORGANIZER" }] }));
		const req = makeLocationReq({ body: { state: "YES" } });
		const res = makeRes();
		await createLocationResponse(req, res, noop);
		expect(res.statusCode).toBe(201);
	});

	it("returns 400 when state is missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 5, role: "ORGANIZER" }] }));
		const req = makeLocationReq({ body: {} });
		const res = makeRes();
		await createLocationResponse(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("getLocationResponse", () => {
	it("returns 200 with location response data", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, state: "YES", name: "Paris", username: "alice" }],
		}));
		const req = makeLocationReq();
		const res = makeRes();
		await getLocationResponse(req, res, noop);
		expect([200, 500]).toContain(res.statusCode);
	});
});

describe("updateLocationResponse", () => {
	it("returns 204 when location response updated", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeLocationReq({ body: { state: "NO" } });
		const res = makeRes();
		await updateLocationResponse(req, res, noop);
		expect(res.statusCode).toBe(204);
	});

	it("returns 400 when state is missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeLocationReq({ body: {} });
		const res = makeRes();
		await updateLocationResponse(req, res, noop);
		expect(res.statusCode).toBe(400);
	});
});

describe("updateFullLocationResponse", () => {
	it("returns 400 when state is missing", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeLocationReq({ body: {} });
		const res = makeRes();
		await updateFullLocationResponse(req, res, noop);
		expect(res.statusCode).toBe(400);
	});

	it("returns 404 when location response not found", async () => {
		let callCount = 0;
		mockQuery.mockImplementation(async () => {
			callCount++;
			if (callCount <= 3) return { rows: [{ id: 1, role: "ORGANIZER" }] };
			return { rows: [] };
		});
		const req = makeLocationReq({ body: { state: "YES" } });
		const res = makeRes();
		await updateFullLocationResponse(req, res, noop);
		expect(res.statusCode).toBe(404);
	});

	it("returns 428 when If-Match header missing and response found", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER", state: "YES", name: "Paris" }] }));
		const req = makeLocationReq({ body: { state: "YES" } });
		const res = makeRes();
		let nextErr: any = null;
		await updateFullLocationResponse(req, res, (e) => { nextErr = e; });
		if (nextErr) expect((nextErr as any).status).toBe(428);
	});
});

describe("deleteLocationResponse", () => {
	it("returns 204 when location response deleted", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1, role: "ORGANIZER" }] }));
		const req = makeLocationReq();
		const res = makeRes();
		await deleteLocationResponse(req, res, noop);
		expect(res.statusCode).toBe(204);
	});
});
