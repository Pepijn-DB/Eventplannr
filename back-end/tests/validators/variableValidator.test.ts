/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { describe, expect, it } from "vitest";
import {
	arrayValidator,
	variableValidator,
} from "../../src/validators/variableValidator.js";

describe("variableValidator", () => {
	it("returns false for null and undefined", () => {
		expect(variableValidator(null)).toBe(false);
		expect(variableValidator(undefined)).toBe(false);
	});

	it("returns true for defined values including falsy primitives", () => {
		expect(variableValidator(0)).toBe(true);
		expect(variableValidator("")).toBe(true);
		expect(variableValidator(false)).toBe(true);
		expect(variableValidator({})).toBe(true);
	});
});

describe("arrayValidator", () => {
	it("returns false for non-array values", () => {
		// @ts-expect-error - testing runtime behavior with wrong input
		expect(arrayValidator(null)).toBe(false);
		// @ts-expect-error
		expect(arrayValidator(undefined)).toBe(false);
		expect(arrayValidator({} as any)).toBe(false);
	});

	it("returns false for arrays containing null/undefined", () => {
		expect(arrayValidator([1, null, 3] as any)).toBe(false);
		expect(arrayValidator([undefined, "a"] as any)).toBe(false);
	});

	it("returns true for arrays of defined values", () => {
		expect(arrayValidator([1, 2, 3])).toBe(true);
		expect(arrayValidator(["a", "b"])).toBe(true);
		expect(arrayValidator([{}, []])).toBe(true);
	});
});
