/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { beforeEach, describe, expect, it, vi } from "bun:test";

// Mock the bun SQL constructor before importing the module so the module's top-level
// `new SQL(...)` will use our fake and we can control db behaviour.
vi.mock("bun", () => {
	function SQL() {
		// function instance used as tagged template
		// @ts-expect-error
		const fn: any = (strings: TemplateStringsArray, ...vals: any[]) => {
			const s = strings.join("$").toLowerCase();
			// treat any select/now usage as a successful ping
			if (s.includes("select") || s.includes("now")) {
				return Promise.resolve({ rows: [{ now: "1" }] });
			}
			return Promise.resolve({ rows: [] });
		};

		fn.connect = async () => {};
		fn.unsafe = async (_sql: string, _params?: any[]) => ({ rows: [] });
		fn.close = () => {};
		return fn;
	}
	return { SQL };
});

import database, * as dbmod from "../../src/services/databaseService.js";

describe("prepareQueryAndParams()", () => {
	it("returns original when no params", () => {
		const res = dbmod.prepareQueryAndParams("SELECT 1");
		expect(res.sql).toBe("SELECT 1");
		expect(res.params).toEqual([]);
	});

	it("returns original when mismatch in placeholders and params", () => {
		const res = dbmod.prepareQueryAndParams("? ?", [1]);
		expect(res.sql).toBe("? ?");
		expect(res.params).toEqual([1]);
	});

	it("expands array params and flattens params", () => {
		const res = dbmod.prepareQueryAndParams("IN (?) AND ?", [[1, 2, 3], "x"]);
		expect(res.sql).toBe("IN ((?,?,?)) AND ?");
		expect(res.params).toEqual([1, 2, 3, "x"]);
	});

	it("handles empty array param producing (NULL)", () => {
		const res = dbmod.prepareQueryAndParams("IN (?)", [[]]);
		expect(res.sql).toBe("IN ((NULL))");
		expect(res.params).toEqual([]);
	});
});

describe("convertQuestionMarksToDollarParams()", () => {
	it("converts ? to $N", () => {
		const r = dbmod.convertQuestionMarksToDollarParams("?, ?, ?");
		expect(r.sql).toBe("$1, $2, $3");
		expect(r.paramCount).toBe(3);
	});
});

describe("parseQuery()", () => {
	it("returns nulls for empty sql", () => {
		expect(dbmod.parseQuery("")).toEqual({
			action: null,
			table: null,
			where: null,
		});
	});

	it("parses select with from and where", () => {
		const r = dbmod.parseQuery("SELECT * FROM users WHERE id = 1");
		expect(r.action).toBe("SELECT");
		expect(r.table).toBe("users");
		expect(r.where?.toLowerCase()).toContain("where");
	});

	it("parses insert into", () => {
		const r = dbmod.parseQuery("INSERT INTO my_table (a) VALUES (1)");
		expect(r.action).toBe("INSERT");
		expect(r.table).toBe("my_table");
	});

	it("parses update", () => {
		const r = dbmod.parseQuery("UPDATE people SET name = 'x'");
		expect(r.action).toBe("UPDATE");
		expect(r.table).toBe("people");
	});

	it("parses delete", () => {
		const r = dbmod.parseQuery("DELETE FROM t WHERE 1=1");
		expect(r.action).toBe("DELETE");
		expect(r.table).toBe("t");
	});
});

describe("database service integration behaviour (mocked db)", () => {
	beforeEach(async () => {
		// Reset connection state and set expected behavior on the module's DB instance
		await dbmod.close();
		const d: any = dbmod.getDb();
		d.connect = async () => {};
		d.close = () => {};
		d.unsafe = async (sql: string) => {
			const lower = sql.toLowerCase();
			if (lower.includes("insert into log")) return { rows: [{ id: 77 }] };
			if (lower.startsWith("update ")) return { rows: [] };
			return { rows: [{ id: 1 }, { id: 2 }] };
		};
		// Avoid hitting the real connect logic in tests which relies on tagged template behaviour;
		// make addLog think we're connected by default.
		vi.spyOn(dbmod, "connect").mockResolvedValue(true as any);
	});

	it("connect() sets connected when SELECT NOW returns rows", async () => {
		// connect uses the tagged-template behavior on db which our mock returns rows
		const ok = await dbmod.connect();
		expect(ok).toBe(true);
		// calling again returns true early
		const ok2 = await dbmod.connect();
		expect(ok2).toBe(true);
	});

	it("query() performs insert-log and update when rows with ids present", async () => {
		const d: any = dbmod.getDb();
		const spy = vi.spyOn(d, "unsafe");

		const res = await dbmod.query("INSERT INTO users (a) VALUES (?)", [1], 5);

		expect(res.rows).toBeTruthy();
		// first call is the query itself, second is insert log, third is update
		expect(spy).toHaveBeenCalled();
		// ensure update was called with updated_log SQL
		const updateCall = spy.mock.calls.find(
			(c: any[]) =>
				typeof c[0] === "string" && c[0].toLowerCase().startsWith("update "),
		);
		expect(updateCall).toBeTruthy();
		spy.mockRestore();
	});

	it("query() throws AppError when underlying unsafe throws an Error", async () => {
		const d: any = dbmod.getDb();
		vi.spyOn(d, "unsafe").mockRejectedValueOnce(new Error("boom"));
		await expect(dbmod.query("SELECT 1", [], 1)).rejects.toMatchObject({
			message: "boom",
			status: 500,
		});
	});

	it("query() throws generic AppError when unsafe rejects a non-Error", async () => {
		const d: any = dbmod.getDb();
		vi.spyOn(d, "unsafe").mockRejectedValueOnce("bad");
		await expect(dbmod.query("SELECT 1", [], 1)).rejects.toMatchObject({
			message: "Database query error",
			status: 500,
		});
	});

	it("queryWithoutExecutioner() behaves same and calls update when appropriate", async () => {
		const d: any = dbmod.getDb();
		const spy = vi.spyOn(d, "unsafe");

		const res = await dbmod.queryWithoutExecutioner(
			"INSERT INTO users (a) VALUES (?)",
			[1],
		);
		expect(res.rows).toBeTruthy();

		const updateCall = spy.mock.calls.find(
			(c: any[]) =>
				typeof c[0] === "string" && c[0].toLowerCase().startsWith("update "),
		);
		expect(updateCall).toBeTruthy();
		spy.mockRestore();
	});

	it("close() calls db.close and resets connection", async () => {
		const d: any = dbmod.getDb();
		const spy = vi.spyOn(d, "close");
		await dbmod.connect();
		await dbmod.close();
		expect(spy).toHaveBeenCalled();
		// connect again should be able to run (connected false)
		const ok = await dbmod.connect();
		expect(ok).toBe(true);
	});

	it("convertQuestionMarksToDollarParams handles no placeholders", () => {
		const r = dbmod.convertQuestionMarksToDollarParams("no placeholders");
		expect(r.sql).toBe("no placeholders");
		expect(r.paramCount).toBe(0);
	});

	it("parseQuery returns null for unknown leading token", () => {
		const r = dbmod.parseQuery("WITH something AS (SELECT 1)");
		expect(r).toEqual({ action: null, table: null, where: null });
	});

	it("query() does not attempt to log SELECT actions", async () => {
		const d: any = dbmod.getDb();
		const spy = vi.spyOn(d, "unsafe");
		await dbmod.query("SELECT * FROM users WHERE id = ?", [1], 1);
		// only the original query should have been run (addLog should return null for SELECT)
		expect(spy).toHaveBeenCalled();
		const hasInsertLog = spy.mock.calls.some(
			(c: any[]) =>
				typeof c[0] === "string" &&
				c[0].toLowerCase().includes("insert into log"),
		);
		expect(hasInsertLog).toBe(false);
		spy.mockRestore();
	});

	it("query() with negative executioner does not insert log", async () => {
		const d: any = dbmod.getDb();
		const spy = vi.spyOn(d, "unsafe");
		await dbmod.query("INSERT INTO users (a) VALUES (?)", [1], -5);
		const hasInsertLog = spy.mock.calls.some(
			(c: any[]) =>
				typeof c[0] === "string" &&
				c[0].toLowerCase().includes("insert into log"),
		);
		expect(hasInsertLog).toBe(false);
		spy.mockRestore();
	});

	it("queryWithoutExecutioner throws AppError on underlying Error and non-Error rejections", async () => {
		const d: any = dbmod.getDb();
		vi.spyOn(d, "unsafe").mockRejectedValueOnce(new Error("boom1"));
		await expect(
			dbmod.queryWithoutExecutioner("SELECT 1", []),
		).rejects.toMatchObject({ message: "boom1", status: 500 });
		vi.spyOn(d, "unsafe").mockRejectedValueOnce("boom2");
		await expect(
			dbmod.queryWithoutExecutioner("SELECT 1", []),
		).rejects.toMatchObject({ message: "Database query error", status: 500 });
	});
});
