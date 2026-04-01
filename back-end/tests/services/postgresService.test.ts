/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("pg", () => {
	const mockPool = {
		query: vi.fn(),
		end: vi.fn(),
	};
	class Pool {
		constructor() {
			// biome-ignore lint/correctness/noConstructorReturn: <Test, so the constructor will not be used anywhere else>
			return mockPool as any;
		}
	}
	return { Pool, __mockPool: mockPool };
});

vi.mock("../../src/services/databaseService.js", () => ({
	prepareQueryAndParams: vi.fn((q, p) => ({ sql: q, params: p })),
	convertQuestionMarksToDollarParams: vi.fn((s) => ({
		sql: s.replace(/\?/g, (_m: any, i: any) => `$${i + 1}`),
		paramCount: (s.match(/\?/g) || []).length,
	})),
	parseQuery: vi.fn(() => ({ action: "INSERT", table: "events", where: null })),
}));

import * as pgService from "../../src/services/postgresService.js";

describe("postgresService", () => {
	beforeEach(async () => {
		const pg = await import("pg");
		const instance = new pg.Pool();
		if (
			!instance ||
			typeof instance.query !== "function" ||
			typeof (instance.query as any).mockReset !== "function"
		) {
			(instance as any).query = vi.fn();
		}
		(instance.query as any).mockReset();
	});

	it("connect returns boolean", async () => {
		const pg = await import("pg");
		const instance = new pg.Pool();
		if (
			!instance ||
			typeof instance.query !== "function" ||
			typeof (instance.query as any).mockResolvedValue !== "function"
		) {
			(instance as any).query = vi.fn();
		}
		(instance.query as any).mockResolvedValue({ rows: [1] });
		const c = await pgService.connect();
		expect(typeof c).toBe("boolean");
	});

	it("query returns rows and updates log when ids present", async () => {
		const pg = await import("pg");
		const instance = new pg.Pool();
		// ensure query is a mock with mockResolvedValueOnce available
		if (
			!instance ||
			typeof instance.query !== "function" ||
			typeof (instance.query as any).mockResolvedValueOnce !== "function"
		) {
			(instance as any).query = vi.fn();
		}
		(instance.query as any).mockResolvedValueOnce({ rows: [{ id: 2 }] });
		(instance.query as any).mockResolvedValueOnce({ rows: [{ id: 10 }] });
		(instance.query as any).mockResolvedValueOnce({ rows: [] });

		const res = await pgService.query(
			"INSERT INTO events (title) VALUES (?)",
			["t"],
			1,
		);
		expect(res).toHaveProperty("rows");
		expect(instance.query).toHaveBeenCalledWith(expect.stringContaining("log"), expect.arrayContaining([1, "events"]));
	});
});
