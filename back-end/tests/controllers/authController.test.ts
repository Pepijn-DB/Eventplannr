/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/validators/variableValidator.js", () => ({
	variableValidator: vi.fn(),
	arrayValidator: vi.fn(),
}));

vi.mock("../../src/validators/emailValidator.js", () => ({
	emailValidator: vi.fn(),
}));

vi.mock("../../src/services/databaseService.js", () => ({
	queryWithoutExecutioner: vi.fn(),
}));

vi.mock("bcrypt", () => ({
	default: { compare: vi.fn() },
	compare: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
	default: { sign: vi.fn() },
	sign: vi.fn(),
}));

vi.mock("../../src/config/config.js", () => ({
	default: { secret: "TEST_SECRET" },
}));

import * as bcryptMod from "bcrypt";
import * as jwtMod from "jsonwebtoken";
import { getToken } from "../../src/controllers/v1/authController.js";
import { AppError } from "../../src/middlewares/errorHandler.js";
import * as dbSvc from "../../src/services/databaseService.js";
import * as emailMod from "../../src/validators/emailValidator.js";
import * as varValidators from "../../src/validators/variableValidator.js";

describe("authController.getToken", () => {
	let req: any;
	let res: any;
	let next: any;

	beforeEach(() => {
		vi.clearAllMocks();
		req = { rateLimit: { remaining: 3 }, body: {} };
		res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		next = vi.fn();
	});

	it("calls next when server not configured", async () => {
		const cfg = await import("../../src/config/config.js");
		(cfg.default as any).secret = "null";

		(varValidators.variableValidator as any).mockReturnValueOnce(true);

		await getToken(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect(err.message).toContain("Server not configured");
	});

	it("returns 400 Missing body when variableValidator indicates missing body", async () => {
		const cfg = await import("../../src/config/config.js");
		(cfg.default as any).secret = "ok";

		(varValidators.variableValidator as any)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(true);

		await getToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing body",
			remainingAttempts: "3",
		});
	});

	it("returns 400 Missing email or password when arrayValidator fails", async () => {
		const cfg = await import("../../src/config/config.js");
		(cfg.default as any).secret = "ok";

		(varValidators.variableValidator as any)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false);
		(varValidators.arrayValidator as any).mockReturnValue(false);

		req.body = { email: null, password: null };

		await getToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing email or password",
			remainingAttempts: "3",
		});
	});

	it("returns 400 Invalid email when emailValidator fails", async () => {
		const cfg = await import("../../src/config/config.js");
		(cfg.default as any).secret = "ok";

		(varValidators.variableValidator as any)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false);
		(varValidators.arrayValidator as any).mockReturnValue(true);
		(emailMod.emailValidator as any).mockReturnValue(false);

		req.body = { email: "bad", password: "p" };

		await getToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Invalid email",
			remainingAttempts: "3",
		});
	});

	it("returns 401 when user not found", async () => {
		const cfg = await import("../../src/config/config.js");
		(cfg.default as any).secret = "ok";

		(varValidators.variableValidator as any)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false);
		(varValidators.arrayValidator as any).mockReturnValue(true);
		(emailMod.emailValidator as any).mockReturnValue(true);

		(dbSvc.queryWithoutExecutioner as any).mockResolvedValue({ rows: [] });

		req.body = { email: "a@b.com", password: "x" };

		await getToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Unauthorized",
			remainingAttempts: "3",
		});
	});

	it("returns 401 when password mismatch", async () => {
		const cfg = await import("../../src/config/config.js");
		(cfg.default as any).secret = "ok";

		(varValidators.variableValidator as any)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false);
		(varValidators.arrayValidator as any).mockReturnValue(true);
		(emailMod.emailValidator as any).mockReturnValue(true);

		(dbSvc.queryWithoutExecutioner as any).mockResolvedValue({
			rows: [{ id: 1, password_hash: "hash", username: "u", email: "a@b.com" }],
		});
		(bcryptMod.compare as any).mockResolvedValue(false);
		if ((bcryptMod as any).default)
			(bcryptMod as any).default.compare.mockResolvedValue(false);

		req.body = { email: "a@b.com", password: "x" };

		await getToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Unauthorized",
			remainingAttempts: "3",
		});
	});

	it("returns 200 and token on success", async () => {
		const cfg = await import("../../src/config/config.js");
		(cfg.default as any).secret = "ok";

		(varValidators.variableValidator as any)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false);
		(varValidators.arrayValidator as any).mockReturnValue(true);
		(emailMod.emailValidator as any).mockReturnValue(true);

		const user = {
			id: 1,
			password_hash: "hash",
			username: "u",
			email: "a@b.com",
		};
		(dbSvc.queryWithoutExecutioner as any).mockResolvedValue({ rows: [user] });
		(bcryptMod.compare as any).mockResolvedValue(true);
		if ((bcryptMod as any).default)
			(bcryptMod as any).default.compare.mockResolvedValue(true);
		(jwtMod.sign as any).mockReturnValue("tok");
		if ((jwtMod as any).default)
			(jwtMod as any).default.sign.mockReturnValue("tok");

		req.body = { email: "a@b.com", password: "x" };

		await getToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ token: "tok" });
	});

	it("calls next when query throws", async () => {
		const cfg = await import("../../src/config/config.js");
		(cfg.default as any).secret = "ok";

		(varValidators.variableValidator as any)
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(false);
		(varValidators.arrayValidator as any).mockReturnValue(true);
		(emailMod.emailValidator as any).mockReturnValue(true);

		const err = new Error("db");
		(dbSvc.queryWithoutExecutioner as any).mockRejectedValue(err);

		req.body = { email: "a@b.com", password: "x" };

		await getToken(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});
});
