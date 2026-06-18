/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it, mock } from "bun:test";

const mockDbQuery = mock(async () => ({
	rows: [{ title: "Event", description: "Desc", creator_user: 1 }],
}));

await mock.module("../../src/services/databaseService.js", () => ({
	default: {
		query: mockDbQuery,
		connect: mock(async () => true),
		queryWithoutExecutioner: mock(async () => ({ rows: [] })),
		transaction: mock(async () => {}),
		parseQuery: mock(() => ({ action: null, table: null, where: null })),
	},
	query: mockDbQuery,
}));

const { getETag, setETag } = await import("../../src/services/eTagService.js");
const { AppError } = await import("../../src/middlewares/errorHandler.js");
const { hash } = await import("../../src/models/hash.js");

function makeReq(userId = 1): any {
	return { user: { id: userId } };
}

describe("getETag", () => {
	it("throws 401 when req.user is missing", async () => {
		try {
			await getETag({} as any, "events", 1);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(401);
		}
	});

	it("throws 400 for invalid table name", async () => {
		try {
			await getETag(makeReq(), "unknown_table", 1);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(400);
		}
	});

	it("returns sha-256 hash for events table", async () => {
		const row = { title: "Event", description: "Desc", creator_user: 1 };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "events", 1);
		expect(typeof result).toBe("string");
		expect(result.length).toBe(64);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("returns hash for event_dates table", async () => {
		const row = { event_id: 1, date: "2024-01-01" };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "event_dates", 1);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("returns hash for event_locations table", async () => {
		const row = { event_id: 1, location_id: 2 };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "event_locations", 1);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("returns hash for invitation table", async () => {
		const row = { event_id: 1, user_id: 2, role: "GUEST" };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "invitation", 1);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("returns hash for location_response table", async () => {
		const row = { location_id: 1, invitation_id: 2, state: "YES" };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "location_response", 1);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("returns hash for date_response table", async () => {
		const row = { date_id: 1, invitation_id: 2, state: "NO" };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "date_response", 1);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("returns hash for location table", async () => {
		const row = { name: "Paris" };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "location", 1);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("returns hash for users table", async () => {
		const row = { username: "alice", email: "alice@example.com", password_hash: "xxx" };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "users", 1);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("returns hash for user_permissions table", async () => {
		const row = { user_id: 1, permission_id: 2, enabled: true };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const result = await getETag(makeReq(), "user_permissions", 1);
		expect(result).toBe(await hash(row, { algorithm: "SHA-256" }));
	});
});

describe("setETag", () => {
	it("sets ETag response header", async () => {
		const row = { title: "Event", description: "Desc", creator_user: 1 };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const headers: Record<string, string> = {};
		const res: any = { setHeader: (k: string, v: string) => { headers[k] = v; } };
		await setETag(makeReq(), "events", 1, res);
		expect(headers["ETag"]).toBeDefined();
		expect(headers["ETag"]).toBe(await hash(row, { algorithm: "SHA-256" }));
	});

	it("throws AppError 400 for invalid table", async () => {
		const res: any = { setHeader: () => {} };
		try {
			await setETag(makeReq(), "bad_table", 1, res);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(400);
		}
	});

	it("throws AppError 500 for other errors", async () => {
		mockDbQuery.mockImplementation(async () => { throw new Error("DB down"); });
		const res: any = { setHeader: () => {} };
		try {
			await setETag(makeReq(), "events", 1, res);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(500);
		}
	});
});
