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

describe("mysqlService", () => {
	beforeAll(async () => {
		mysqlService = await import("../../src/services/mysqlService.js");
	});

	beforeEach(() => {
		(db.queryWithoutExecutioner as any).mockReset();
	});

	it("connect returns boolean based on query", async () => {
		(db.queryWithoutExecutioner as any).mockResolvedValue({ rows: [1] });
		const c = await mysqlService.connect();
		expect(typeof c).toBe("boolean");
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
		pool.execute.mockResolvedValue([[{ id: 5 }], null]);
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
});
