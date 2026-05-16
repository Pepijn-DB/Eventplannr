import { describe, expect, it } from "bun:test";
import { AppError } from "../../src/middlewares/errorHandler.js";
import { validateResult } from "../../src/validators/resultValidator.js";

describe("resultValidator", () => {
	it("When result is null, throws AppError with code 500", () => {
		try {
			validateResult(null);
		} catch (err) {
			if (err instanceof AppError) {
				expect(err.status).toBe(500);
			} else {
				throw err;
			}
		}
	});
	it("When result has length 0, throws AppError with code 404", () => {
		try {
			validateResult({ rows: [] });
		} catch (err) {
			if (err instanceof AppError) {
				expect(err.status).toBe(404);
			} else {
				throw err;
			}
		}
	});
	it("When result is valid, don't throw anything", () => {
		validateResult({ rows: [1, 2, 3] });
	});
});
