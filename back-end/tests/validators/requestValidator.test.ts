/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/middlewares/errorHandler.js";
import {
	eventValidator,
	ifMatchValidator,
	invitationValidator,
	userValidator,
} from "../../src/validators/requestValidator.js";

vi.mock("../../src/services/eTagService", () => ({
	getETag: vi.fn(),
}));

import { getETag } from "../../src/services/eTagService.js";

beforeEach(() => {
	vi.resetAllMocks();
});

describe("requestValidator", () => {
	it("userValidator throws when no user", () => {
		expect(() => userValidator({} as any)).toThrowError(AppError);
	});

	it("userValidator returns id when user present", () => {
		const id = userValidator({ user: { id: 42 } } as any);
		expect(id).toBe(42);
	});

	it("eventValidator throws when missing or invalid id", () => {
		expect(() => eventValidator({ params: {} } as any)).toThrowError(AppError);
		expect(() =>
			eventValidator({ params: { event_id: "abc" } } as any),
		).toThrowError(AppError);
	});

	it("eventValidator returns number when valid", () => {
		expect(eventValidator({ params: { event_id: "10" } } as any)).toBe(10);
	});

	it("invitationValidator throws when missing or invalid id", () => {
		expect(() => invitationValidator({ params: {} } as any)).toThrowError(
			AppError,
		);
		expect(() =>
			invitationValidator({ params: { invitation_id: "x" } } as any),
		).toThrowError(AppError);
	});

	it("invitationValidator returns number when valid", () => {
		expect(invitationValidator({ params: { invitation_id: "7" } } as any)).toBe(
			7,
		);
	});

	it("ifMatchValidator throws when If-Match header missing", async () => {
		const req = { get: () => undefined, headers: {} } as any;
		try {
			await ifMatchValidator(req, "events", 1);
			throw new Error("Expected to throw");
		} catch (err: any) {
			expect(err).toBeInstanceOf(AppError);
			expect(err.status).toBe(428);
		}
	});

	it("ifMatchValidator throws Precondition failed when etag mismatch", async () => {
		(getETag as any).mockResolvedValue("abc");
		const req = {
			get: () => "different",
			headers: { "if-match": "different" },
		} as any;
		try {
			await ifMatchValidator(req, "events", 2);
			throw new Error("Expected to throw");
		} catch (err: any) {
			expect(err).toBeInstanceOf(AppError);
			expect(err.status).toBe(412);
		}
	});

	it("ifMatchValidator returns true when etag matches", async () => {
		(getETag as any).mockResolvedValue("the-etag");
		const req = {
			get: () => "the-etag",
			headers: { "if-match": "the-etag" },
		} as any;
		const res = await ifMatchValidator(req, "events", 3);
		expect(res).toBe(true);
	});
});
