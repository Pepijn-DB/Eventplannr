import { describe, expect, it } from "bun:test";
import { AppError } from "../../src/middlewares/errorHandler.js";
import { validateResult } from "../../src/validators/resultValidator.js";

describe("validateResult", () => {
	it("does not throw when result has rows", () => {
		expect(() => validateResult({ rows: [{ id: 1 }] })).not.toThrow();
	});

	it("throws 500 AppError when result is null", () => {
		expect(() => validateResult(null)).toThrow(AppError);
		try {
			validateResult(null);
		} catch (e) {
			expect((e as AppError).status).toBe(500);
			expect((e as AppError).message).toBe("Result returned null");
		}
	});

	it("throws 500 AppError when result is undefined", () => {
		expect(() => validateResult(undefined)).toThrow(AppError);
		try {
			validateResult(undefined);
		} catch (e) {
			expect((e as AppError).status).toBe(500);
		}
	});

	it("throws 404 AppError when result has empty rows and needsRows is true (default)", () => {
		expect(() => validateResult({ rows: [] })).toThrow(AppError);
		try {
			validateResult({ rows: [] });
		} catch (e) {
			expect((e as AppError).status).toBe(404);
			expect((e as AppError).message).toBe("Resource not found");
		}
	});

	it("does not throw when result has empty rows and needsRows is false", () => {
		expect(() => validateResult({ rows: [] }, false)).not.toThrow();
	});

	it("does not throw when rows is undefined and needsRows is true", () => {
		expect(() =>
			validateResult({ rows: undefined as unknown as never[] }),
		).not.toThrow();
	});
});
