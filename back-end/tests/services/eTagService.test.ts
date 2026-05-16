/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { beforeEach, describe, expect, it, vi } from "bun:test";
import database from "../../src/services/databaseService.js";
import * as eTagService from "../../src/services/eTagService.js";

vi.mock("../../src/services/databaseService.js", () => {
	const query = vi.fn();
	const prepareQueryAndParams = vi.fn();
	const parseQuery = vi.fn();
	const queryWithoutExecutioner = vi.fn();
	const convertQuestionMarksToDollarParams = vi.fn();
	return {
		default: {
			query,
			prepareQueryAndParams,
			parseQuery,
			queryWithoutExecutioner,
			convertQuestionMarksToDollarParams,
			connect: vi.fn(),
			close: vi.fn(),
		},
		query,
		prepareQueryAndParams,
		parseQuery,
		queryWithoutExecutioner,
		convertQuestionMarksToDollarParams,
	};
});

vi.mock("../../src/validators/requestValidator.js", () => ({
	userValidator: () => 1,
}));

const req = {
	user: {
		id: 1,
		username: "user",
		email: "test@email.local",
	},
} as any;

describe("getETag()", () => {
	beforeEach(() => {
		(database.query as any).mockReset();

		(database.query as any).mockResolvedValue({
			rows: [{ username: "u", email: "e", password_hash: "h" }],
		});
	});

	it("getETag for users table computes hash from db row", async () => {
		const h = await eTagService.getETag(req, "users", 1);
		expect(typeof h).toBe("string");
		expect(h.length).toBeGreaterThan(0);
	});

	it("getETag throws for unknown table", async () => {
		await expect(eTagService.getETag(req, "nope", 1)).rejects.toThrow();
	});

	describe("All tables", () => {
		async function testTable(table: string) {
			await eTagService.getETag(req, table, 1);
			await expect(database.query).toHaveBeenCalledWith(
				expect.stringContaining(table),
				[1],
				1,
			);
		}

		it("getETag() for events", async () => {
			await testTable("events");
		});

		it("getETag() for event_dates", async () => {
			await testTable("event_dates");
		});

		it("getETag() for event_locations", async () => {
			await testTable("event_locations");
		});

		it("getETag() for invitation", async () => {
			await testTable("invitation");
		});

		it("getETag() for location_response", async () => {
			await testTable("location_response");
		});

		it("getETag() for date_response", async () => {
			await testTable("date_response");
		});

		it("getETag() for location", async () => {
			await testTable("location");
		});

		it("getETag() for users", async () => {
			await testTable("users");
		});

		it("getETag() for user_permissions", async () => {
			await testTable("user_permissions");
		});
	});
});

describe("setETag()", () => {
	let res = {} as any;

	beforeEach(() => {
		(database.query as any).mockReset();
		res = { setHeader: vi.fn() } as any;
	});

	it("setETag() calls res.setHeader", async () => {
		(database.query as any).mockResolvedValue({
			rows: [{ username: "u", email: "e", password_hash: "h" }],
		});
		await eTagService.setETag(req, "users", 1, res);
		expect(res.setHeader).toHaveBeenCalled();
	});

	it("setETag() throws for unknown table with invalid table", async () => {
		await expect(eTagService.setETag(req, "nope", 1, res)).rejects.toThrow(
			expect.objectContaining({ message: "Invalid table", status: 400 }),
		);
	});

	it("setETag() throws AppError with message for any other error", async () => {
		const spy = vi
			.spyOn(database, "query")
			.mockRejectedValue(new Error("Unknown error"));
		await expect(eTagService.setETag(req, "users", 1, res)).rejects.toThrow(
			expect.objectContaining({ message: "Unknown error", status: 500 }),
		);
		spy.mockRestore();
	});

	it("setETag() throws AppError for anything other than an error", async () => {
		const spy = vi.spyOn(database, "query").mockRejectedValue("Unknown");
		await expect(eTagService.setETag(req, "users", 1, res)).rejects.toThrow(
			expect.objectContaining({
				message: "Internal server error",
				status: 500,
			}),
		);
		spy.mockRestore();
	});
});
