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

import * as db from "../../src/services/databaseService.js";
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

	describe("connect()", () => {
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

			await pgService.close();
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

		it("connect returns false when pool.connect has an error", async () => {
			const pg = await import("pg");
			const instance = new pg.Pool();
			if (
				!instance ||
				typeof instance.query !== "function" ||
				typeof (instance.query as any).mockRejectedValue !== "function"
			) {
				(instance as any).query = vi.fn();
			}

			const spy = vi
				.spyOn(instance, "query")
				.mockThrow(new Error("Test error"));

			const c = await pgService.connect();
			expect(c).toBe(false);

			spy.mockRestore();
		});
	});

	describe("query()", () => {
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
			(instance.query as any).mockResolvedValue({ rows: [{ id: 2 }] });

			const res = await pgService.query(
				"INSERT INTO events (title) VALUES (?)",
				["t"],
				1,
			);
			expect(res).toHaveProperty("rows");
			expect(instance.query).toHaveBeenCalledWith(
				expect.stringContaining("log"),
				expect.arrayContaining([1, "events"]),
			);
		});

		vi.restoreAllMocks();

		it("query still runs when add log fails", async () => {
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

			const spy = vi.spyOn(db, "parseQuery").mockThrow(new Error("Test error"));

			(instance.query as any).mockResolvedValueOnce({ rows: [1] });

			const res = await pgService.query(
				"INSERT INTO events (title) VALUES (?)",
				["t"],
				1,
			);

			expect(res).toHaveProperty("rows");

			spy.mockRestore();
		});

		it("query returns error when query fails", async () => {
			const pg = await import("pg");
			const pool = new pg.Pool() as any;

			if (
				!pool.query ||
				typeof (pool.query as any).mockResolvedValue !== "function"
			) {
				pool.execute = vi.fn();
			}

			const spy = vi
				.spyOn(db, "prepareQueryAndParams")
				.mockThrow(new Error("Test error"));
			await expect(
				async () =>
					await pgService.query(
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

	it("close calls pool.end", async () => {
		const pg = await import("pg");
		const pool = new pg.Pool() as any;

		await pgService.close();

		expect(pool.end).toHaveBeenCalled();
	});
});
