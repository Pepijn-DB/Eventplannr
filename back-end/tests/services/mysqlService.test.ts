/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../../src/services/databaseService.js";

// Don't import mysqlService at top-level because it initializes a pool on import.
let mysqlService: any;

vi.mock("../../src/services/databaseService.js", () => {
	const prepareQueryAndParams = vi.fn();
	const parseQuery = vi.fn();
	const queryWithoutExecutioner = vi.fn();
	const convertQuestionMarksToDollarParams = vi.fn();
	const query = vi.fn();
	return {
		default: {
			prepareQueryAndParams,
			parseQuery,
			queryWithoutExecutioner,
			convertQuestionMarksToDollarParams,
			query,
			connect: vi.fn(),
			close: vi.fn(),
		},
		prepareQueryAndParams,
		parseQuery,
		queryWithoutExecutioner,
		convertQuestionMarksToDollarParams,
		query,
	};
});

vi.mock("mysql2/promise", () => {
	const mockPool = {
		execute: vi.fn(),
		end: vi.fn(),
		connect: vi.fn(),
	};
	const createPool = () => {
		return mockPool;
	};
	return {
		default: {
			createPool,
		},
		createPool,
		__esModule: true,
	};
});

describe("connect()", () => {
	beforeAll(async () => {
		mysqlService = await import("../../src/services/mysqlService.js");
	});

	beforeEach(async () => {
		(db.queryWithoutExecutioner as any).mockReset();
		mysqlService.connected = false;
	});

	it("connect returns false when pool.connect has an error", async () => {
		const spy = vi
			.spyOn(db, "queryWithoutExecutioner")
			.mockRejectedValue(new Error("Test error"));
		const c = await mysqlService.connect();
		expect(c).toBe(false);
		spy.mockRestore();
	});

	it("connect returns boolean based on query", async () => {
		(db.queryWithoutExecutioner as any).mockResolvedValue({ rows: [1] });
		const c = await mysqlService.connect();
		expect(typeof c).toBe("boolean");
	});
});

describe("query()", () => {
	beforeAll(async () => {
		mysqlService = await import("../../src/services/mysqlService.js");
	});

	beforeEach(() => {
		(db.queryWithoutExecutioner as any).mockReset();
	});

	it("query calls pool.execute and returns rows", async () => {
		const mysql = await import("mysql2/promise");
		const pool = mysql.createPool({} as any) as any;

		if (
			!pool.execute ||
			typeof (pool.execute as any).mockResolvedValue !== "function"
		) {
			pool.execute = vi.fn();
		}

		(db.prepareQueryAndParams as any).mockImplementation((q: any, p: any) => ({
			sql: q,
			params: p,
		}));
		pool.execute.mockResolvedValue([[{ id: 5 }]]);
		(db.parseQuery as any).mockReturnValue({
			action: "INSERT",
			table: "events",
			where: null,
		});

		const res = await mysqlService.query(
			"INSERT INTO events (title) VALUES (?)",
			["t"],
			1,
		);
		expect(res).toHaveProperty("rows");
		expect(Array.isArray(res?.rows)).toBe(true);
	});

	it("query calls pool.execute and returns rows with arrays", async () => {
		const mysql = await import("mysql2/promise");
		const pool = mysql.createPool({} as any) as any;

		if (
			!pool.execute ||
			typeof (pool.execute as any).mockResolvedValue !== "function"
		) {
			pool.execute = vi.fn();
		}

		(db.prepareQueryAndParams as any).mockImplementation((q: any, p: any) => ({
			sql: q,
			params: p,
		}));
		pool.execute.mockResolvedValue([[{ id: 5 }], null]);

		const res = await mysqlService.query(
			"INSERT INTO events (title) VALUES (?, ?, ?)",
			["t", [1, 2], []],
			1,
		);

		expect(res).toHaveProperty("rows");
		expect(Array.isArray(res?.rows)).toBe(true);
	});

	it("query calls pool.execute and succeeds with successful logging", async () => {
		const mysql = await import("mysql2/promise");
		const pool = mysql.createPool({} as any) as any;

		if (
			!pool.execute ||
			typeof (pool.execute as any).mockResolvedValue !== "function"
		) {
			pool.execute = vi.fn();
		}

		(db.prepareQueryAndParams as any).mockImplementation((q: any, p: any) => ({
			sql: q,
			params: p,
		}));
		pool.execute.mockResolvedValue([[{ id: 5, insertId: 3 }]]);

		// const spy_log = vi.spyOn(mysqlService, "addLog").mockResolvedValue(1);
		const res1 = await mysqlService.query(
			"INSERT INTO events (title) VALUES (?)",
			["t"],
			1,
		);

		expect(res1).toHaveProperty("rows");
		expect(pool.execute).toHaveBeenCalledWith(
			"UPDATE events SET updated_log = ? WHERE id IN (?);",
			[3, 5],
		);
		expect(Array.isArray(res1?.rows)).toBe(true);
	});

	it("query is successful even when logging fails", async () => {
		const mysql = await import("mysql2/promise");
		const pool = mysql.createPool({} as any) as any;

		if (
			!pool.execute ||
			typeof (pool.execute as any).mockResolvedValue !== "function"
		) {
			pool.execute = vi.fn();
		}

		(db.prepareQueryAndParams as any).mockImplementation((q: any, p: any) => ({
			sql: q,
			params: p,
		}));
		pool.execute.mockResolvedValue([]);

		// const spy_log = vi.spyOn(mysqlService, "addLog").mockResolvedValue(1);
		const res1 = await mysqlService.query(
			"INSERT INTO events (title) VALUES (?)",
			["t"],
			1,
		);

		expect(res1).toHaveProperty("rows");
		expect(Array.isArray(res1?.rows)).toBe(true);
	});

	it("query returns an error when it catches one", async () => {
		const mysql = await import("mysql2/promise");
		const pool = mysql.createPool({} as any) as any;

		if (
			!pool.execute ||
			typeof (pool.execute as any).mockResolvedValue !== "function"
		) {
			pool.execute = vi.fn();
		}

		(db.queryWithoutExecutioner as any).mockResolvedValueOnce({
			rows: [{ id: 5 }],
		});

		const spy = vi
			.spyOn(db, "prepareQueryAndParams")
			.mockThrow(new Error("Test error"));
		await expect(
			async () =>
				await mysqlService.query(
					"INSERT INTO events (title) VALUES (?)",
					["t"],
					1,
				),
		).rejects.toThrow(
			expect.objectContaining({
				message: "Test error",
				status: 500,
			}),
		);
		spy.mockRestore();
	});
});

describe("close()", () => {
	beforeAll(async () => {
		mysqlService = await import("../../src/services/mysqlService.js");
	});

	it("close calls pool.end", async () => {
		const mysql = await import("mysql2/promise");
		const pool = mysql.createPool({} as any) as any;
		await mysqlService.close();
		expect(pool.end).toHaveBeenCalled();
	});
});
