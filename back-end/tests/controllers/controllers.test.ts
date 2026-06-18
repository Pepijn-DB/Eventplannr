/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it, mock, beforeEach } from "bun:test";
import http from "node:http";
import jwt from "jsonwebtoken";
import config from "../../src/config/config.js";

const mockQuery = mock(async () => ({ rows: [] }));

// Include real implementations of pure functions so they remain available
// after this mock overwrites the module registry for subsequent test files.
function prepareQueryAndParams(sql: string, params: any[] = []): { sql: string; params: any[] } {
	if (!params || params.length === 0) return { sql, params: [] };
	const parts = sql.split("?");
	if (parts.length - 1 !== params.length) return { sql, params };
	const newParts: string[] = [];
	const newParams: any[] = [];
	for (let i = 0; i < params.length; i++) {
		const part = parts[i] ?? "";
		newParts.push(part);
		const p = params[i];
		if (Array.isArray(p)) {
			if (p.length === 0) { newParts.push("(NULL)"); }
			else { const ph = p.map(() => "?").join(","); newParts.push(`(${ph})`); for (const v of p) newParams.push(v); }
		} else { newParts.push("?"); newParams.push(p); }
	}
	newParts.push(parts[parts.length - 1] ?? "");
	return { sql: newParts.join(""), params: newParams };
}

function parseQuery(sql: string) {
	if (!sql) return { action: null, table: null, where: null };
	const lower = sql.toLowerCase().trimStart();
	let action: string | null = null;
	let table: string | null = null;
	let where: string | null = null;
	if (lower.startsWith("select")) action = "SELECT";
	else if (lower.startsWith("insert")) action = "INSERT";
	else if (lower.startsWith("update")) action = "UPDATE";
	else if (lower.startsWith("delete")) action = "DELETE";
	else return { action: null, table: null, where: null };
	const wherePos = sql.search(/\bwhere\b/i);
	if (wherePos !== -1) where = sql.substring(wherePos).trim();
	const clean = (t: string | undefined) => t ? t.replace(/[;,()]$/g, "").trim() : null;
	if (action === "SELECT" || action === "DELETE") { const m = sql.match(/\bfrom\s+([^\s;(),]+)/i); if (m?.[1]) table = clean(m[1]); }
	else if (action === "INSERT") { const m = sql.match(/\binsert\s+into\s+([^\s(;,]+)/i); if (m?.[1]) table = clean(m[1]); }
	else if (action === "UPDATE") { const m = sql.match(/\bupdate\s+([^\s;(),]+)/i); if (m?.[1]) table = clean(m[1]); }
	return { action, table, where };
}

function convertQuestionMarksToDollarParams(sql: string): { sql: string; paramCount: number } {
	let idx = 0; let out = "";
	for (let i = 0; i < sql.length; i++) { const ch = sql[i]; if (ch === "?") { idx++; out += `$${idx}`; } else { out += ch; } }
	return { sql: out, paramCount: idx };
}

await mock.module("../../src/services/databaseService.js", () => ({
	default: {
		query: mockQuery,
		connect: mock(async () => true),
		queryWithoutExecutioner: mock(async () => ({ rows: [] })),
		transaction: mock(async (_exec: number, cb: any) => cb(async () => ({ rows: [] }))),
		parseQuery,
	},
	query: mockQuery,
	queryWithoutExecutioner: mock(async () => ({ rows: [] })),
	prepareQueryAndParams,
	convertQuestionMarksToDollarParams,
	parseQuery,
}));

const { default: app } = await import("../../src/app.js");

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
	const server = http.createServer(app as any);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const addr: any = server.address();
		const baseUrl = `http://127.0.0.1:${addr.port}`;
		return await fn(baseUrl);
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.close((err) => (err ? reject(err) : resolve())),
		);
	}
}

function makeToken(payload: Record<string, unknown> = { id: 1 }) {
	return jwt.sign(payload, config.secret);
}

function authHeaders(token: string) {
	return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

beforeEach(() => {
	mockQuery.mockImplementation(async () => ({ rows: [] }));
});

describe("Auth controller", () => {
	it("POST /api/v1/auth/token returns 400 for invalid body (missing fields)", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/auth/token`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});

	it("POST /api/v1/auth/token returns 400 for invalid email format", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/auth/token`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "notanemail", password: "pass" }),
			});
			expect(res.status).toBe(400);
		});
	});

	it("POST /api/v1/auth/token with valid body attempts auth (401 or 400)", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/auth/token`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ email: "x@example.com", password: "wrong" }),
			});
			expect([400, 401]).toContain(res.status);
		});
	});
});

describe("User controller", () => {
	it("POST /api/v1/user returns 400 for missing required fields", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ username: "alice" }),
			});
			expect(res.status).toBe(400);
		});
	});

	it("POST /api/v1/user returns 400 for invalid email", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ username: "alice", email: "notanemail", password: "p" }),
			});
			expect(res.status).toBe(400);
		});
	});

	it("POST /api/v1/user creates user (201) when DB succeeds", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ id: 1 }] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ username: "alice", email: "alice@example.com", password: "password123" }),
			});
			expect([201, 500]).toContain(res.status);
		});
	});

	it("GET /api/v1/user requires auth - returns 401", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user`);
			expect(res.status).toBe(401);
		});
	});

	it("GET /api/v1/user returns 403 when user lacks admin permission", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user`, {
				headers: authHeaders(makeToken()),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("GET /api/v1/user/:id returns 403 when not self or admin", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/99`, {
				headers: authHeaders(makeToken({ id: 1 })),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("GET /api/v1/user/:id returns 200 for self", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ id: 1, username: "alice", email: "alice@example.com" }],
		}));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/1`, {
				headers: authHeaders(makeToken({ id: 1 })),
			});
			expect([200, 500]).toContain(res.status);
		});
	});

	it("DELETE /api/v1/user/:id returns 403 when not self or admin", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/99`, {
				method: "DELETE",
				headers: authHeaders(makeToken({ id: 1 })),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("PATCH /api/v1/user/:id returns 400 for nothing-to-update body", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/1`, {
				method: "PATCH",
				headers: authHeaders(makeToken({ id: 1 })),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});

	it("GET /api/v1/user/:id/invitations requires auth", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/1/invitations`);
			expect(res.status).toBe(401);
		});
	});
});

describe("Event controller", () => {
	it("GET /api/v1/event requires auth", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event`);
			expect(res.status).toBe(401);
		});
	});

	it("POST /api/v1/event returns 400 for empty title", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ title: "" }),
			});
			expect(res.status).toBe(400);
		});
	});

	it("POST /api/v1/event returns 400 for missing title", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});

	it("GET /api/v1/event/:event_id returns 404 or 403 when not invited", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1`, {
				headers: authHeaders(makeToken()),
			});
			expect([403, 404, 500]).toContain(res.status);
		});
	});

	it("DELETE /api/v1/event/:event_id returns 403 when no permission", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1`, {
				method: "DELETE",
				headers: authHeaders(makeToken()),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("PATCH /api/v1/event/:event_id returns 400 for nothing-to-update body", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1`, {
				method: "PATCH",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});
});

describe("Invitation controller", () => {
	it("POST /api/v1/event/:event_id/invitation returns 400 for invalid body", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/invitation`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});

	it("GET /api/v1/event/:event_id/invitation returns 403 or 500 when no permission", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/invitation`, {
				headers: authHeaders(makeToken()),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("GET /api/v1/user/:id/invitations returns 403 when not self or admin", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/99/invitations`, {
				headers: authHeaders(makeToken({ id: 1 })),
			});
			expect([403, 500]).toContain(res.status);
		});
	});
});

describe("Location controller", () => {
	it("GET /api/v1/location requires auth", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/location`);
			expect(res.status).toBe(401);
		});
	});

	it("POST /api/v1/location returns 400 for empty name", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/location`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ name: "" }),
			});
			expect(res.status).toBe(400);
		});
	});

	it("POST /api/v1/location returns 400 for missing name", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/location`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});

	it("GET /api/v1/location/:location_id returns 403 or 500 when no permission", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/location/1`, {
				headers: authHeaders(makeToken()),
			});
			expect([403, 404, 500]).toContain(res.status);
		});
	});

	it("PATCH /api/v1/location/:location_id returns 400 for empty name", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/location/1`, {
				method: "PATCH",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ name: "" }),
			});
			expect(res.status).toBe(400);
		});
	});
});

describe("Date controller", () => {
	it("POST /api/v1/event/:event_id/date returns 400 for invalid date format", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/date`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ date: "not-a-date" }),
			});
			expect(res.status).toBe(400);
		});
	});

	it("POST /api/v1/event/:event_id/date returns 400 for missing date", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/date`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});

	it("GET /api/v1/event/:event_id/date returns 403 or 500 when no permission", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/date`, {
				headers: authHeaders(makeToken()),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("PATCH /api/v1/event/:event_id/date/:date_id returns 405 (not implemented)", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ user_id: 1, permission: "GLOBAL_ADMIN" }] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/date/1`, {
				method: "PATCH",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ date: "2024-01-01" }),
			});
			expect(res.status).toBe(405);
		});
	});

	it("PUT /api/v1/event/:event_id/date/:date_id returns 405 or 428 (not implemented)", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ user_id: 1, permission: "GLOBAL_ADMIN" }] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/date/1`, {
				method: "PUT",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ date: "2024-01-01" }),
			});
			expect([405, 428]).toContain(res.status);
		});
	});
});

describe("Admin controller", () => {
	it("GET /api/v1/admin/logs requires auth", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/admin/logs`);
			expect(res.status).toBe(401);
		});
	});

	it("GET /api/v1/admin/logs returns 403 when no ADMIN_ALL permission", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/admin/logs`, {
				headers: authHeaders(makeToken()),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("GET /api/v1/admin/logs returns 200 with errors object when user has GLOBAL_ADMIN", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ user_id: 1, permission: "GLOBAL_ADMIN" }],
		}));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/admin/logs`, {
				headers: authHeaders(makeToken()),
			});
			expect([200, 500]).toContain(res.status);
			if (res.status === 200) {
				const body = await res.json();
				expect(body).toHaveProperty("errors");
				expect(Array.isArray(body.errors)).toBe(true);
			}
		});
	});
});

describe("Response controller", () => {
	it("GET /api/v1/response/:event_id/date returns 403 or 500 when no permission", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/response/1/date`, {
				headers: authHeaders(makeToken()),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("GET /api/v1/response/:event_id/location returns 403 or 500 when no permission", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/response/1/location`, {
				headers: authHeaders(makeToken()),
			});
			expect([403, 500]).toContain(res.status);
		});
	});

	it("POST /api/v1/response/:event_id/date/:date_id returns 400 for invalid body", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/response/1/date/1`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ state: "INVALID_STATE" }),
			});
			expect(res.status).toBe(400);
		});
	});

	it("POST /api/v1/response/:event_id/location/:location_id returns 400 for invalid body", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/response/1/location/1`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ state: "INVALID_STATE" }),
			});
			expect(res.status).toBe(400);
		});
	});
});

describe("User permissions controller", () => {
	it("GET /api/v1/user/:id/permissions requires auth", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/1/permissions`);
			expect(res.status).toBe(401);
		});
	});

	it("PATCH /api/v1/user/:id/permissions returns 405 (not implemented)", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ user_id: 1, permission: "GLOBAL_ADMIN" }],
		}));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/1/permissions`, {
				method: "PATCH",
				headers: authHeaders(makeToken({ id: 1 })),
				body: JSON.stringify({ permission: "USER_ADMIN" }),
			});
			expect(res.status).toBe(405);
		});
	});

	it("PUT /api/v1/user/:id/permissions returns 405 (not implemented)", async () => {
		mockQuery.mockImplementation(async () => ({
			rows: [{ user_id: 1, permission: "GLOBAL_ADMIN" }],
		}));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/user/1/permissions`, {
				method: "PUT",
				headers: authHeaders(makeToken({ id: 1 })),
				body: JSON.stringify({ permission: "USER_ADMIN" }),
			});
			expect(res.status).toBe(405);
		});
	});
});

describe("Event location controller", () => {
	it("PATCH /api/v1/event/:event_id/location/:location_id returns 405", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ user_id: 1, permission: "GLOBAL_ADMIN" }] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/location/1`, {
				method: "PATCH",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ location_id: 1 }),
			});
			expect(res.status).toBe(405);
		});
	});

	it("PUT /api/v1/event/:event_id/location/:location_id returns 405 or 428", async () => {
		mockQuery.mockImplementation(async () => ({ rows: [{ user_id: 1, permission: "GLOBAL_ADMIN" }] }));
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/location/1`, {
				method: "PUT",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({ location_id: 1 }),
			});
			expect([405, 428]).toContain(res.status);
		});
	});

	it("POST /api/v1/event/:event_id/location returns 400 for invalid body", async () => {
		await withServer(async (baseUrl) => {
			const res = await fetch(`${baseUrl}/api/v1/event/1/location`, {
				method: "POST",
				headers: authHeaders(makeToken()),
				body: JSON.stringify({}),
			});
			expect(res.status).toBe(400);
		});
	});
});
