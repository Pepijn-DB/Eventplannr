/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "bun:test";

vi.mock("jsonwebtoken", () => ({
	default: { verify: vi.fn() },
	verify: vi.fn(),
}));

import * as jwt from "jsonwebtoken";
import { checkToken } from "../../src/middlewares/v1/authHandler.js";

describe("authHandler.checkToken", () => {
	let req: any;
	let res: any;
	let next: any;

	beforeEach(() => {
		vi.clearAllMocks();
		next = vi.fn();
		res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		req = { headers: {}, path: "/", method: "GET" } as any;
	});

	it("skips authentication for noAuthRequired path/method", () => {
		req.path = "/api/v1/auth/token";
		req.method = "GET";
		checkToken(req, res, next);
		expect(next).toHaveBeenCalled();
	});

	it("returns 401 when no Authorization header", () => {
		checkToken(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Unauthorized. No token provided.",
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 401 when header has no token part", () => {
		req.headers.authorization = "Bearer";
		checkToken(req, res, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Unauthorized. No (valid) token provided.",
		});
	});

	it("returns 403 when jwt.verify throws", () => {
		req.headers.authorization = "Bearer invalidtoken";
		// mock the default export's verify (used by the module)
		((jwt as any).default.verify as any).mockImplementation(() => {
			throw new Error("bad");
		});
		checkToken(req, res, next);
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({
			message: "Forbidden - Invalid or expired token",
		});
	});

	it("sets req.user and calls next when token valid", () => {
		req.headers.authorization = "Bearer validtoken";
		const user = { id: 5, username: "u" };
		((jwt as any).default.verify as any).mockReturnValue(user);
		checkToken(req, res, next);
		expect(next).toHaveBeenCalled();
		expect(req.user).toEqual(user);
	});
});
