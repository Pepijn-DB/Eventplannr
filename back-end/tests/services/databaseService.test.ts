import { describe, expect, it } from "vitest";
import {
	convertQuestionMarksToDollarParams,
	parseQuery,
	prepareQueryAndParams,
} from "../../src/services/databaseService.js";

describe("databaseService utilities", () => {
	it("prepareQueryAndParams expands array params for IN clauses", () => {
		const sql = "SELECT * FROM users WHERE id IN (?) AND status = ?";
		const { sql: preparedSql, params } = prepareQueryAndParams(sql, [
			[1, 2],
			"active",
		]);
		expect(preparedSql).toContain("(?,?)");
		expect(params).toEqual([1, 2, "active"]);
	});

	it("prepareQueryAndParams returns original when params length mismatch", () => {
		const sql = "SELECT * FROM foo WHERE a = ? AND b = ?";
		const { sql: preparedSql, params } = prepareQueryAndParams(sql, [1]);
		expect(preparedSql).toBe(sql);
		expect(params).toEqual([1]);
	});

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
	});

	it("convertQuestionMarksToDollarParams replaces ? with $n", () => {
		const sql = "INSERT INTO t (a,b,c) VALUES (?,?,?)";
		const res = convertQuestionMarksToDollarParams(sql);
		expect(res.sql).toContain("$1");
		expect(res.paramCount).toBe(3);
	});
});
