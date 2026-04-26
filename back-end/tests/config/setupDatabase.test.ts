/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
/** biome-ignore-all lint/correctness/noUnusedFunctionParameters: <Tests could use unused params> */

import { promises as fsp } from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dbConfig } from "../../src/config/config.js";
import { setupDatabase, setupSql } from "../../src/config/setupDatabase.js";
import * as dbSvc from "../../src/services/databaseService.js";

describe("setupDatabase", () => {
	let originalType: string;
	let originalDb: string;

	beforeEach(() => {
		originalType = dbConfig.type;
		originalDb = dbConfig.database;
		vi.clearAllMocks();
	});

	describe("setupSql", () => {
		let tmpFile: string;
		afterEach(async () => {
			if (tmpFile) {
				try {
					await fsp.unlink(tmpFile);
				} catch {}
			}
		});

		it("executes CREATE DATABASE and SQL statements from file", async () => {
			const calls: string[] = [];
			vi.spyOn(dbSvc, "queryWithoutExecutioner").mockImplementation(
				async (sql: string) => {
					calls.push(sql);
					return { rows: [] } as any;
				},
			);

			tmpFile = path.join(process.cwd(), "tests", "config", "tmp_schema.sql");
			await fsp.writeFile(
				tmpFile,
				"CREATE TABLE t (id INT);INSERT INTO t VALUES (1);",
			);

			await setupSql(tmpFile);

			expect(calls.length).toBeGreaterThanOrEqual(3);
			// @ts-expect-error
			expect(calls[0].startsWith("CREATE DATABASE")).toBe(true);
			expect(calls.some((c) => c.includes("CREATE TABLE t"))).toBe(true);
			expect(calls.some((c) => c.includes("INSERT INTO t"))).toBe(true);
		});

		it("logs and returns when file read fails", async () => {
			const calls: string[] = [];
			vi.spyOn(dbSvc, "queryWithoutExecutioner").mockImplementation(
				async (sql: string) => {
					calls.push(sql);
					return { rows: [] } as any;
				},
			);
			const errSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => undefined);

			await setupSql("non-existent-file.sql");

			// @ts-expect-error
			expect(calls[0].startsWith("CREATE DATABASE")).toBe(true);
			expect(errSpy).toHaveBeenCalled();
			errSpy.mockRestore();
		});

		it("logs and returns when a query execution fails", async () => {
			const calls: string[] = [];
			let callIndex = 0;
			vi.spyOn(dbSvc, "queryWithoutExecutioner").mockImplementation(
				async (sql: string) => {
					calls.push(sql);
					callIndex++;
					if (callIndex === 3) throw new Error("exec fail");
					return { rows: [] } as any;
				},
			);

			tmpFile = path.join(process.cwd(), "tests", "config", "tmp_schema2.sql");
			await fsp.writeFile(
				tmpFile,
				"CREATE TABLE a (id INT);CREATE TABLE b (id INT);",
			);

			const errSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => undefined);
			await setupSql(tmpFile);
			// @ts-expect-error
			expect(calls[0].startsWith("CREATE DATABASE")).toBe(true);
			expect(calls.some((c) => c.includes("CREATE TABLE a"))).toBe(true);
			expect(errSpy).toHaveBeenCalled();
			errSpy.mockRestore();
		});
	});

	afterEach(() => {
		dbConfig.type = originalType;
		dbConfig.database = originalDb;
		vi.restoreAllMocks();
	});

	it("returns false when connect() returns false", async () => {
		vi.spyOn(dbSvc, "connect").mockResolvedValue(false as any);
		const res = await setupDatabase();
		expect(res).toBe(false);
	});

	it("postgres: returns null when database exists", async () => {
		dbConfig.type = "postgres";
		dbConfig.database = "mydb";
		vi.spyOn(dbSvc, "connect").mockResolvedValue(true as any);
		vi.spyOn(dbSvc, "queryWithoutExecutioner").mockImplementation(
			async (sql: string) => {
				if (sql.includes("pg_database"))
					return { rows: [{ datname: dbConfig.database }] } as any;
				return { rows: [] } as any;
			},
		);

		const res = await setupDatabase();
		expect(res).toBeNull();
	});

	it("postgres: creates database and runs SQL when database does not exist", async () => {
		dbConfig.type = "postgres";
		dbConfig.database = "newdb";
		const calls: string[] = [];

		vi.spyOn(dbSvc, "connect").mockResolvedValue(true as any);
		vi.spyOn(dbSvc, "queryWithoutExecutioner").mockImplementation(
			async (sql: string) => {
				calls.push(sql);
				// return empty rows for existence check
				return { rows: [] } as any;
			},
		);

		const res = await setupDatabase();
		// setupDatabase returns true (setupSql triggers CREATE DATABASE synchronously)
		expect(res).toBe(true);

		// Ensure CREATE DATABASE was called
		expect(calls.some((c) => c.startsWith("CREATE DATABASE"))).toBe(true);
	});

	it("mysql: returns null when schema exists and true when it does not", async () => {
		dbConfig.type = "mysql";
		dbConfig.database = "myschema";
		vi.spyOn(dbSvc, "connect").mockResolvedValue(true as any);

		const spyQuery = vi
			.spyOn(dbSvc, "queryWithoutExecutioner")
			.mockImplementation(async (sql: string) => {
				if (sql.includes("INFORMATION_SCHEMA"))
					return { rows: [{ SCHEMA_NAME: dbConfig.database }] } as any;
				return { rows: [] } as any;
			});

		const resExists = await setupDatabase();
		expect(resExists).toBeNull();

		// Now simulate not existing
		spyQuery.mockImplementationOnce(
			async (sql: string) => ({ rows: [] }) as any,
		);
		// ensure subsequent calls also succeed
		spyQuery.mockImplementation(async (sql: string) => {
			return { rows: [] } as any;
		});

		const res = await setupDatabase();
		expect(res).toBe(true);
	});

	it("throws AppError when connect() rejects with Error", async () => {
		vi.spyOn(dbSvc, "connect").mockRejectedValue(new Error("boom") as any);
		await expect(setupDatabase()).rejects.toEqual(
			expect.objectContaining({
				message: "Error setting up database: boom",
				status: 500,
			}),
		);
	});

	it("throws generic AppError when connect() rejects with non-Error", async () => {
		vi.spyOn(dbSvc, "connect").mockRejectedValue("oops" as any);
		await expect(setupDatabase()).rejects.toEqual(
			expect.objectContaining({
				message: "Error setting up database",
				status: 500,
			}),
		);
	});

	it("throws Unsupported database type when type is unknown", async () => {
		// make connect succeed but leave type unsupported
		vi.spyOn(dbSvc, "connect").mockResolvedValue(true as any);
		const original = dbConfig.type;
		dbConfig.type = "not-a-db";
		try {
			await expect(setupDatabase()).rejects.toEqual(
				expect.objectContaining({
					message: "Unsupported database type",
					status: 500,
				}),
			);
		} finally {
			dbConfig.type = original;
		}
	});

	it("wraps queryWithoutExecutioner errors into AppError", async () => {
		dbConfig.type = "postgres";
		vi.spyOn(dbSvc, "connect").mockResolvedValue(true as any);
		vi.spyOn(dbSvc, "queryWithoutExecutioner").mockRejectedValue(
			new Error("query fail") as any,
		);
		await expect(setupDatabase()).rejects.toEqual(
			expect.objectContaining({
				message: "Error setting up database: query fail",
				status: 500,
			}),
		);
	});

	it("throws AppError when database name is invalid", async () => {
		dbConfig.type = "postgres";
		dbConfig.database = "bad-name!";
		vi.spyOn(dbSvc, "connect").mockResolvedValue(true as any);
		await expect(setupDatabase()).rejects.toEqual(
			expect.objectContaining({
				message: "Error setting up database: Invalid database name in configuration",
			}),
		);
	});

	it("quoteIdentifier escapes identifiers for postgres and mysql when using setupSql", async () => {
		const calls: string[] = [];
		dbConfig.type = "postgres";
		dbConfig.database = 'db"name';
		vi.spyOn(dbSvc, "queryWithoutExecutioner").mockImplementation(
			async (sql: string) => {
				calls.push(sql);
				return { rows: [] } as any;
			},
		);
		await setupSql("non-existent-file-for-quote-test.sql");
		expect(calls[0]).toContain('"db""name"');

		calls.length = 0;
		dbConfig.type = "mysql";
		dbConfig.database = 'db`name';
		vi.spyOn(dbSvc, "queryWithoutExecutioner").mockImplementation(
			async (sql: string) => {
				calls.push(sql);
				return { rows: [] } as any;
			},
		);
		await setupSql("non-existent-file-for-quote-test.sql");
		expect(calls[0]).toContain('`db``name`');
	});
});
