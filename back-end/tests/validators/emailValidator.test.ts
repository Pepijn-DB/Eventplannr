import { describe, expect, it } from "bun:test";
import { emailValidator } from "../../src/validators/emailValidator.js";

describe("emailValidator", () => {
	it("returns true for a valid email", () => {
		expect(emailValidator("user@example.com")).toBe(true);
	});

	it("returns true when email contains @", () => {
		expect(emailValidator("a@b")).toBe(true);
	});

	it("returns true when email contains a dot", () => {
		expect(emailValidator("nodomain.whatever")).toBe(true);
	});

	it("returns false for a string with no @ and no dot", () => {
		expect(emailValidator("nodomain")).toBe(false);
	});

	it("returns true for multiple @ signs (split gives 3 parts, length !== 2, but dot check passes)", () => {
		// "a@b@c" split('@') => ['a','b','c'] length 3 (not 2), but split('.') => ['a@b@c'] length 1 < 2
		expect(emailValidator("a@b@c")).toBe(false);
	});

	it("returns true for empty string with dot", () => {
		expect(emailValidator("no.at")).toBe(true);
	});
});
