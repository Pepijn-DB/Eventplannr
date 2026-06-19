import { describe, expect, it } from "bun:test";
import {
	arrayValidator,
	variableValidator,
} from "../../src/validators/variableValidator.js";

describe("variableValidator", () => {
	it("returns true for a non-null, non-undefined value", () => {
		expect(variableValidator("hello")).toBe(true);
		expect(variableValidator(0)).toBe(true);
		expect(variableValidator(false)).toBe(true);
		expect(variableValidator({})).toBe(true);
	});

	it("returns false for null", () => {
		expect(variableValidator(null)).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(variableValidator(undefined)).toBe(false);
	});
});

describe("arrayValidator", () => {
	it("returns true for a non-empty array with no null/undefined elements", () => {
		expect(arrayValidator([1, 2, 3])).toBe(true);
		expect(arrayValidator(["a", "b"])).toBe(true);
	});

	it("returns false for a non-array value", () => {
		expect(arrayValidator("not an array" as never)).toBe(false);
		expect(arrayValidator(123 as never)).toBe(false);
	});

	it("returns false when any element is null", () => {
		expect(arrayValidator([1, null, 3])).toBe(false);
	});

	it("returns false when any element is undefined", () => {
		expect(arrayValidator([1, undefined, 3])).toBe(false);
	});

	it("returns true for empty array (no null elements to fail)", () => {
		expect(arrayValidator([])).toBe(true);
	});
});
