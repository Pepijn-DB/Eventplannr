/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it, mock } from "bun:test";

const mockDbQuery = mock(async () => ({ rows: [{ title: "Test", description: "Desc", creator_user: 1 }] }));

await mock.module("../../src/services/databaseService.js", () => ({
	default: {
		query: mockDbQuery,
		connect: mock(async () => true),
		queryWithoutExecutioner: mock(async () => ({ rows: [] })),
		transaction: mock(async () => {}),
		parseQuery: mock(() => ({ action: null, table: null, where: null })),
	},
	query: mockDbQuery,
}));

const { userValidator, eventValidator, invitationValidator, ifMatchValidator } =
	await import("../../src/validators/requestValidator.js");
const { AppError } = await import("../../src/middlewares/errorHandler.js");

describe("userValidator", () => {
	it("returns user id when req.user is set", () => {
		const req: any = { user: { id: 5 } };
		expect(userValidator(req)).toBe(5);
	});

	it("throws 401 AppError when req.user is not set", () => {
		const req: any = {};
		expect(() => userValidator(req)).toThrow(AppError);
		try {
			userValidator(req);
		} catch (e) {
			expect((e as AppError).status).toBe(401);
		}
	});
});

describe("eventValidator", () => {
	it("returns event id as number from req.params.event_id", () => {
		const req: any = { params: { event_id: "42" } };
		expect(eventValidator(req)).toBe(42);
	});

	it("throws 400 when event_id is missing", () => {
		const req: any = { params: {} };
		expect(() => eventValidator(req)).toThrow(AppError);
		try {
			eventValidator(req);
		} catch (e) {
			expect((e as AppError).status).toBe(400);
		}
	});

	it("throws 400 when event_id is not a number", () => {
		const req: any = { params: { event_id: "abc" } };
		expect(() => eventValidator(req)).toThrow(AppError);
		try {
			eventValidator(req);
		} catch (e) {
			expect((e as AppError).status).toBe(400);
		}
	});
});

describe("invitationValidator", () => {
	it("returns invitation id as number from req.params.invitation_id", () => {
		const req: any = { params: { invitation_id: "7" } };
		expect(invitationValidator(req)).toBe(7);
	});

	it("throws 400 when invitation_id is missing", () => {
		const req: any = { params: {} };
		expect(() => invitationValidator(req)).toThrow(AppError);
		try {
			invitationValidator(req);
		} catch (e) {
			expect((e as AppError).status).toBe(400);
		}
	});

	it("throws 400 when invitation_id is not a number", () => {
		const req: any = { params: { invitation_id: "xyz" } };
		expect(() => invitationValidator(req)).toThrow(AppError);
	});
});

describe("ifMatchValidator", () => {
	it("throws 428 when If-Match header is missing", async () => {
		const req: any = {
			user: { id: 1 },
			get: () => undefined,
			headers: {},
		};
		try {
			await ifMatchValidator(req, "events", 1);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(428);
		}
	});

	it("returns true when If-Match header matches computed etag", async () => {
		const { hash } = await import("../../src/models/hash.js");
		const row = { title: "Test", description: "Desc", creator_user: 1 };
		mockDbQuery.mockImplementation(async () => ({ rows: [row] }));
		const expectedEtag = await hash(row, { algorithm: "SHA-256" });

		const req: any = {
			user: { id: 1 },
			get: (h: string) => (h === "If-Match" ? expectedEtag : undefined),
			headers: {},
		};
		const result = await ifMatchValidator(req, "events", 1);
		expect(result).toBe(true);
	});

	it("throws 412 when If-Match header does not match computed etag", async () => {
		mockDbQuery.mockImplementation(async () => ({
			rows: [{ title: "Test", description: "Desc", creator_user: 1 }],
		}));

		const req: any = {
			user: { id: 1 },
			get: (h: string) => (h === "If-Match" ? "wrong-etag" : undefined),
			headers: {},
		};
		try {
			await ifMatchValidator(req, "events", 1);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(412);
		}
	});

	it("uses headers['if-match'] as fallback", async () => {
		const req: any = {
			user: { id: 1 },
			get: () => undefined,
			headers: { "if-match": undefined },
		};
		try {
			await ifMatchValidator(req, "events", 1);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(428);
		}
	});
});
