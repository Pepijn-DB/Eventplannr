import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { dbConfig } from "../../src/config/config.js";
import {
	close,
	connect,
	convertQuestionMarksToDollarParams,
	parseQuery,
	prepareQueryAndParams,
	query,
	queryWithoutExecutioner,
} from "../../src/services/databaseService.js";

vi.mock("../../src/services/mysqlService.js", () => {
	return {
		default: {
			connect: vi.fn().mockResolvedValue(false),
			query: vi.fn(),
			close: vi.fn(),
		},
		connect: vi.fn().mockResolvedValue(false),
		query: vi.fn(),
		close: vi.fn(),
	};
});

vi.mock("../../src/services/postgresService.js", () => {
	return {
		default: {
			connect: vi.fn().mockResolvedValue(false),
			query: vi.fn(),
			close: vi.fn(),
		},
		connect: vi.fn().mockResolvedValue(false),
		query: vi.fn(),
		close: vi.fn(),
	};
});

describe("prepareQueryAndParams()", () => {
	it("prepareQueryAndParams expands array params for IN clauses", () => {
		const sql = "SELECT * FROM users WHERE id IN (?) AND status = ?";
		const { sql: preparedSql, params } = prepareQueryAndParams(sql, [
			[1, 2],
			"active",
		]);
		expect(preparedSql).toContain("(?,?)");
		expect(params).toEqual([1, 2, "active"]);
	});

	it("prepareQueryAndParams returns (NULL) if empty arrays", () => {
		const sql = "SELECT * FROM users WHERE id IN (?) AND status = ?";
		const { sql: preparedSql, params } = prepareQueryAndParams(sql, [
			[],
			"active",
		]);
		expect(preparedSql).toContain("(NULL)");
		expect(params).toEqual(["active"]);
	});

	it("prepareQueryAndParams returns original when params length mismatch", () => {
		const sql = "SELECT * FROM foo WHERE a = ? AND b = ?";
		const { sql: preparedSql, params } = prepareQueryAndParams(sql, [1]);
		expect(preparedSql).toBe(sql);
		expect(params).toEqual([1]);
	});
});

describe("parseQuery()", () => {
	it("parseQuery extracts action, table and where", () => {
		const q1 = "SELECT * FROM users WHERE id = 1";
		expect(parseQuery(q1)).toEqual({
			action: "SELECT",
			table: "users",
			where: "WHERE id = 1",
		});

		const q2 = "INSERT INTO events (title) VALUES (?)";
		expect(parseQuery(q2).action).toBe("INSERT");
		expect(parseQuery(q2).table).toBe("events");

		const q3 = "UPDATE locations SET name = ? WHERE id = 5";
		expect(parseQuery(q3)).toEqual({
			action: "UPDATE",
			table: "locations",
			where: "WHERE id = 5",
		});

		const q4 = "DELETE FROM foo WHERE bar = 2";
		expect(parseQuery(q4)).toEqual({
			action: "DELETE",
			table: "foo",
			where: "WHERE bar = 2",
		});

		const q5 = "NO ACTION WHERE id = 1";
		expect(parseQuery(q5)).toEqual({
			action: null,
			table: null,
			where: null,
		});
	});
});

describe("convertQuestionMarksToDollarParams()", () => {
	it("convertQuestionMarksToDollarParams replaces ? with $n", () => {
		const sql = "INSERT INTO t (a,b,c) VALUES (?,?,?)";
		const res = convertQuestionMarksToDollarParams(sql);
		expect(res.sql).toContain("$1");
		expect(res.paramCount).toBe(3);
	});
});

describe("connect()", () => {
	let originalType: string;
	beforeEach(() => {
		originalType = dbConfig.type;
	});

	afterEach(() => {
		dbConfig.type = originalType;
	});

	it("connect with mysql", async () => {
		dbConfig.type = "mysql";
		expect(await connect()).toEqual(false);
	});

	it("connect with postgres", async () => {
		dbConfig.type = "postgres";
		expect(await connect()).toEqual(false);
	});

	it("connect with an unknown database type", async () => {
		dbConfig.type = "unknown";

		await expect(async () => await connect()).rejects.toThrow(
			expect.objectContaining({
				message: "Unknown database connection",
				status: 500,
			}),
		);
	});
});

describe("query()", () => {
	let originalType: string;
	beforeEach(async () => {
		originalType = dbConfig.type;
		vi.clearAllMocks();
		const mysql = await import("../../src/services/mysqlService.js");
		const pg = await import("../../src/services/postgresService.js");
		const mysqlDefault = vi.mocked(mysql.default, true);
		const pgDefault = vi.mocked(pg.default, true);
		mysqlDefault.connect.mockResolvedValue(false);
		pgDefault.connect.mockResolvedValue(false);
	});

	afterEach(() => {
		dbConfig.type = originalType;
	});

	it("query with mysql should reject when DB is not available", async () => {
		dbConfig.type = "mysql";
		await expect(query("SELECT 1", [], 0)).rejects.toEqual(
			expect.objectContaining({
				message: "Database connection error",
				status: 500,
			}),
		);
	});

	it("query with postgres should reject when DB is not available", async () => {
		dbConfig.type = "postgres";
		await expect(query("SELECT 1", [], 0)).rejects.toEqual(
			expect.objectContaining({
				message: "Database connection error",
				status: 500,
			}),
		);
	});

	it("query with an unknown database type should throw Unknown database connection", async () => {
		dbConfig.type = "unknown";
		await expect(query("SELECT 1", [], 0)).rejects.toEqual(
			expect.objectContaining({
				message: "Unknown database connection",
				status: 500,
			}),
		);
	});

	it("postgres query uses postgres client when available", async () => {
		dbConfig.type = "postgres";
		const pg = await import("../../src/services/postgresService.js");
		const pgDefault = vi.mocked(pg.default, true);
		pgDefault.connect.mockResolvedValue(true);
		pgDefault.query.mockResolvedValue({ rows: [{ id: 10 }] });

		const res = await query("SELECT * FROM events", [], 1);
		expect(res).toHaveProperty("rows");
		expect(Array.isArray(res.rows)).toBe(true);
		expect(res.rows[0].id).toBe(10);
	});

	it("mysql query returns rows when mysqlService.query returns result", async () => {
		dbConfig.type = "mysql";
		const mysql = await import("../../src/services/mysqlService.js");
		const mysqlDefault = vi.mocked(mysql.default, true);
		mysqlDefault.connect.mockResolvedValue(true);
		mysqlDefault.query.mockResolvedValue({ rows: [{ id: 5 }] });

		const res = await query("INSERT INTO events (title) VALUES (?)", ["t"], 1);
		expect(res).toHaveProperty("rows");
		expect(Array.isArray(res.rows)).toBe(true);
		expect(res.rows[0].id).toBe(5);
	});

	it("mysql query returns empty rows when mysqlService.query returns null", async () => {
		dbConfig.type = "mysql";
		const mysql = await import("../../src/services/mysqlService.js");
		const mysqlDefault = vi.mocked(mysql.default, true);
		mysqlDefault.connect.mockResolvedValue(true);
		mysqlDefault.query.mockResolvedValue(null);

		const res = await query("SELECT 1", [], 1);
		expect(res).toHaveProperty("rows");
		expect(Array.isArray(res.rows)).toBe(true);
		expect(res.rows.length).toBe(0);
	});
});

describe("queryWithoutExecutioner()", () => {
	let originalType: string;
	beforeEach(async () => {
		originalType = dbConfig.type;
		vi.clearAllMocks();
		const mysql = await import("../../src/services/mysqlService.js");
		const pg = await import("../../src/services/postgresService.js");
		const mysqlDefault = vi.mocked(mysql.default, true);
		const pgDefault = vi.mocked(pg.default, true);
		mysqlDefault.connect.mockResolvedValue(false);
		pgDefault.connect.mockResolvedValue(false);
	});

	afterEach(() => {
		dbConfig.type = originalType;
	});

	it("query with mysql should reject when DB is not available", async () => {
		dbConfig.type = "mysql";
		await expect(queryWithoutExecutioner("SELECT 1", [])).rejects.toEqual(
			expect.objectContaining({
				message: "Database connection error",
				status: 500,
			}),
		);
	});

	it("query with postgres should reject when DB is not available", async () => {
		dbConfig.type = "postgres";
		await expect(queryWithoutExecutioner("SELECT 1", [])).rejects.toEqual(
			expect.objectContaining({
				message: "Database connection error",
				status: 500,
			}),
		);
	});

	it("query with an unknown database type should throw Unknown database connection", async () => {
		dbConfig.type = "unknown";
		await expect(queryWithoutExecutioner("SELECT 1", [])).rejects.toEqual(
			expect.objectContaining({
				message: "Unknown database connection",
				status: 500,
			}),
		);
	});

	it("postgres query uses postgres client when available", async () => {
		dbConfig.type = "postgres";
		const pg = await import("../../src/services/postgresService.js");
		const pgDefault = vi.mocked(pg.default, true);
		pgDefault.connect.mockResolvedValue(true);
		pgDefault.query.mockResolvedValue({ rows: [{ id: 10 }] });

		const res = await queryWithoutExecutioner("SELECT * FROM events", []);
		expect(res).toHaveProperty("rows");
		expect(Array.isArray(res.rows)).toBe(true);
		expect(res.rows[0].id).toBe(10);
	});

	it("mysql query returns rows when mysqlService.query returns result", async () => {
		dbConfig.type = "mysql";
		const mysql = await import("../../src/services/mysqlService.js");
		const mysqlDefault = vi.mocked(mysql.default, true);
		mysqlDefault.connect.mockResolvedValue(true);
		mysqlDefault.query.mockResolvedValue({ rows: [{ id: 5 }] });

		const res = await queryWithoutExecutioner(
			"INSERT INTO events (title) VALUES (?)",
			["t"],
		);
		expect(res).toHaveProperty("rows");
		expect(Array.isArray(res.rows)).toBe(true);
		expect(res.rows[0].id).toBe(5);
	});

	it("mysql query returns empty rows when mysqlService.query returns null", async () => {
		dbConfig.type = "mysql";
		const mysql = await import("../../src/services/mysqlService.js");
		const mysqlDefault = vi.mocked(mysql.default, true);
		mysqlDefault.connect.mockResolvedValue(true);
		mysqlDefault.query.mockResolvedValue(null);

		const res = await queryWithoutExecutioner("SELECT 1", []);
		expect(res).toHaveProperty("rows");
		expect(Array.isArray(res.rows)).toBe(true);
		expect(res.rows.length).toBe(0);
	});
});

describe("close()", () => {
	let originalType: string;
	beforeEach(() => {
		originalType = dbConfig.type;
	});

	afterEach(() => {
		dbConfig.type = originalType;
	});

	it("connect with mysql", async () => {
		dbConfig.type = "mysql";
		expect(await close());
	});

	it("connect with postgres", async () => {
		dbConfig.type = "postgres";
		expect(await close());
	});
});
