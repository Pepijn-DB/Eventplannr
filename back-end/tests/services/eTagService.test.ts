/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("../../validators/requestValidator.js", () => ({
	userValidator: () => 42,
}));

const req = {
	user: {
		id: 1,
		username: "user",
		email: "test@email.local",
	},
};

describe("eTagService", () => {
	beforeEach(() => {
		(database.query as any).mockReset();
	});

	it("getETag for users table computes hash from db row", async () => {
		(database.query as any).mockResolvedValue({
			rows: [{ username: "u", email: "e", password_hash: "h" }],
		});
		const h = await eTagService.getETag(req as any, "users", 1);
		expect(typeof h).toBe("string");
		expect(h.length).toBeGreaterThan(0);
	});

	it("setETag calls res.setHeader", async () => {
		(database.query as any).mockResolvedValue({
			rows: [{ username: "u", email: "e", password_hash: "h" }],
		});
		const res = { setHeader: vi.fn() } as any;
		await eTagService.setETag(req as any, "users", 1, res);
		expect(res.setHeader).toHaveBeenCalled();
	});

	it("getETag throws for unknown table", async () => {
		await expect(eTagService.getETag(req as any, "nope", 1)).rejects.toThrow();
	});
});
