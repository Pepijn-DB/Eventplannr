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

	it("returns false for multiple @ signs", () => {
		expect(emailValidator("a@b@c")).toBe(false);
	});

	it("returns true for a string with a dot but no @", () => {
		expect(emailValidator("no.at")).toBe(true);
	});
});
