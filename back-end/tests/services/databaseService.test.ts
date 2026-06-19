import { describe, expect, it } from "bun:test";
import {
	convertQuestionMarksToDollarParams,
	parseQuery,
	prepareQueryAndParams,
} from "../../src/services/databaseService.js";

describe("parseQuery", () => {
	it("returns nulls for empty string", () => {
		expect(parseQuery("")).toEqual({ action: null, table: null, where: null });
	});

	it("parses SELECT with FROM and WHERE", () => {
		const result = parseQuery("SELECT * FROM users WHERE id = 1");
		expect(result.action).toBe("SELECT");
		expect(result.table).toBe("users");
		expect(result.where).toBe("WHERE id = 1");
	});

	it("parses INSERT INTO", () => {
		const result = parseQuery("INSERT INTO events (title) VALUES (?)");
		expect(result.action).toBe("INSERT");
		expect(result.table).toBe("events");
		expect(result.where).toBeNull();
	});

	it("parses UPDATE with WHERE", () => {
		const result = parseQuery("UPDATE users SET name = ? WHERE id = ?");
		expect(result.action).toBe("UPDATE");
		expect(result.table).toBe("users");
		expect(result.where).toBe("WHERE id = ?");
	});

	it("parses DELETE FROM with WHERE", () => {
		const result = parseQuery("DELETE FROM locations WHERE id = ?");
		expect(result.action).toBe("DELETE");
		expect(result.table).toBe("locations");
		expect(result.where).toBe("WHERE id = ?");
	});

	it("returns null action for unknown statement", () => {
		const result = parseQuery("DROP TABLE users");
		expect(result.action).toBeNull();
		expect(result.table).toBeNull();
	});

	it("is case-insensitive for keywords", () => {
		const result = parseQuery("select * from events where id = 1");
		expect(result.action).toBe("SELECT");
		expect(result.table).toBe("events");
	});

	it("returns null where when no WHERE clause", () => {
		const result = parseQuery("SELECT * FROM users");
		expect(result.where).toBeNull();
	});
});

describe("prepareQueryAndParams", () => {
	it("returns original sql when no params", () => {
		const result = prepareQueryAndParams("SELECT * FROM users", []);
		expect(result.sql).toBe("SELECT * FROM users");
		expect(result.params).toEqual([]);
	});

	it("replaces scalar params in order", () => {
		const result = prepareQueryAndParams(
			"SELECT * FROM users WHERE id = ? AND name = ?",
			[1, "Alice"],
		);
		expect(result.sql).toBe(
			"SELECT * FROM users WHERE id = ? AND name = ?",
		);
		expect(result.params).toEqual([1, "Alice"]);
	});

	it("expands array params into IN clause placeholders", () => {
		const result = prepareQueryAndParams(
			"SELECT * FROM users WHERE id IN ?",
			[[1, 2, 3]],
		);
		expect(result.sql).toContain("(?,?,?)");
		expect(result.params).toEqual([1, 2, 3]);
	});

	it("handles empty array param as (NULL)", () => {
		const result = prepareQueryAndParams(
			"SELECT * FROM users WHERE id IN ?",
			[[]],
		);
		expect(result.sql).toContain("(NULL)");
		expect(result.params).toEqual([]);
	});

	it("returns original when placeholder count mismatches params", () => {
		const result = prepareQueryAndParams("SELECT * FROM users WHERE id = ?", [
			1,
			2,
		]);
		expect(result.sql).toBe("SELECT * FROM users WHERE id = ?");
		expect(result.params).toEqual([1, 2]);
	});

	it("handles mix of scalar and array params", () => {
		const result = prepareQueryAndParams(
			"SELECT * FROM t WHERE a = ? AND b IN ?",
			[42, [1, 2]],
		);
		expect(result.sql).toContain("a = ?");
		expect(result.sql).toContain("(?,?)");
		expect(result.params).toEqual([42, 1, 2]);
	});
});

describe("convertQuestionMarksToDollarParams", () => {
	it("converts ? to $1, $2, etc.", () => {
		const result = convertQuestionMarksToDollarParams(
			"SELECT * FROM users WHERE id = ? AND name = ?",
		);
		expect(result.sql).toBe(
			"SELECT * FROM users WHERE id = $1 AND name = $2",
		);
		expect(result.paramCount).toBe(2);
	});

	it("returns unchanged sql with paramCount=0 when no ?", () => {
		const result = convertQuestionMarksToDollarParams(
			"SELECT * FROM users",
		);
		expect(result.sql).toBe("SELECT * FROM users");
		expect(result.paramCount).toBe(0);
	});

	it("handles single ?", () => {
		const result = convertQuestionMarksToDollarParams("WHERE id = ?");
		expect(result.sql).toBe("WHERE id = $1");
		expect(result.paramCount).toBe(1);
	});

	it("handles multiple ? in sequence", () => {
		const result = convertQuestionMarksToDollarParams("(?,?,?,?)");
		expect(result.sql).toBe("($1,$2,$3,$4)");
		expect(result.paramCount).toBe(4);
	});
});
