/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "bun:test";

vi.mock("../../src/validators/requestValidator.js", () => ({
	ifMatchValidator: vi.fn(),
	userValidator: vi.fn(),
}));

vi.mock("../../src/validators/variableValidator.js", () => ({
	variableValidator: vi.fn(),
}));

vi.mock("../../src/validators/resultValidator.js", () => ({
	validateResult: vi.fn(),
}));

vi.mock("../../src/services/databaseService.js", () => ({
	default: { query: vi.fn(), queryWithoutExecutioner: vi.fn() },
}));

vi.mock("../../src/services/permissionService.js", () => ({
	hasGlobalPermission: vi.fn(),
}));

vi.mock("../../src/services/eTagService.js", () => ({
	setETag: vi.fn(),
}));

import {
	createUser,
	createUserPermission,
	deleteUser,
	deleteUserPermission,
	getUser,
	getUserPermissions,
	getUsers,
	updateFullUser,
	updateFullUserPermission,
	updateUser,
	updateUserPermission,
} from "../../src/controllers/v1/userController.js";
import { AppError } from "../../src/middlewares/errorHandler.js";
import dbSvc from "../../src/services/databaseService.js";
import * as eTag from "../../src/services/eTagService.js";
import * as perm from "../../src/services/permissionService.js";
import * as reqValidators from "../../src/validators/requestValidator.js";
import * as resVal from "../../src/validators/resultValidator.js";
import * as varValidator from "../../src/validators/variableValidator.js";

describe("userController", () => {
	let req: any;
	let res: any;
	let next: any;

	beforeEach(() => {
		vi.clearAllMocks();

		req = { params: {}, body: {}, rateLimit: {} };
		res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		next = vi.fn();

		(reqValidators.userValidator as any).mockReturnValue(42);
		(varValidator.variableValidator as any).mockImplementation(
			(v: any) => v !== undefined && v !== null,
		);
		(resVal.validateResult as any).mockImplementation(() => {});
	});

	it("getUsers returns 403 when not admin", async () => {
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await getUsers(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getUsers returns 200 on success", async () => {
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 1 }] });

		await getUsers(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ result: [{ id: 1 }] });
	});

	it("getUser returns 403 when not admin and not self", async () => {
		req.params.id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await getUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("getUser returns 200 and sets ETag on success", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(false);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 42 }] });
		(eTag.setETag as any).mockResolvedValue(undefined);

		await getUser(req, res, next);

		expect(eTag.setETag).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("createUser returns 400 when missing fields", async () => {
		req.body = {};

		await createUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("createUser returns 201 on success", async () => {
		req.body = { username: "u", password: "p", email: "e" };
		(dbSvc.queryWithoutExecutioner as any).mockResolvedValue({});

		await createUser(req, res, next);

		expect(dbSvc.queryWithoutExecutioner).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("createUser forwards DB error to next", async () => {
		req.body = { username: "u", password: "p", email: "e" };
		const err = new Error("db");
		(dbSvc.queryWithoutExecutioner as any).mockRejectedValue(err);

		await createUser(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateUser returns 403 when not admin and not self", async () => {
		req.params.id = "99";
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await updateUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("updateUser returns 400 when nothing to update", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body = {};

		await updateUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("updateUser updates and returns 204 on success", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body = { username: "x", email: "y", password: "z" };
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateUser(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("updateFullUser returns 403 when not admin and not self", async () => {
		req.params.id = "99";
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await updateFullUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("updateFullUser returns 400 when missing fields", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body = { username: "u" };

		await updateFullUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("updateFullUser calls ifMatch and updates on success", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body = { username: "u", email: "e", password: "p" };
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateFullUser(req, res, next);

		expect(reqValidators.ifMatchValidator).toHaveBeenCalled();
		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("updateFullUser returns 400 when variableValidator makes fields null", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body = { username: "u", email: "e", password: "p" };
		(varValidator.variableValidator as any).mockImplementation(
			(v: any) => v === req.params.id,
		);

		await updateFullUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		(varValidator.variableValidator as any).mockImplementation(
			(v: any) => v !== undefined && v !== null,
		);
	});

	it("deleteUser returns 403 when not admin and not self", async () => {
		req.params.id = "99";
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await deleteUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("deleteUser deletes and returns 204 on success", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await deleteUser(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("getUserPermissions returns 401 when userId missing", async () => {
		(reqValidators.userValidator as any).mockReturnValue(0);
		req.params.id = "5";

		await getUserPermissions(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("getUserPermissions returns 403 when not admin", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		req.params.id = "5";
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await getUserPermissions(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("getUserPermissions returns 200 on success", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		req.params.id = "5";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ permission: "X" }] });

		await getUserPermissions(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("updateUserPermission and updateFullUserPermission return 405 when admin", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(true);

		await updateUserPermission(req, res, next);
		expect(res.status).toHaveBeenCalledWith(405);

		await updateFullUserPermission(req, res, next);
		expect(res.status).toHaveBeenCalledWith(405);
	});

	it("deleteUserPermission returns 400 when missing permission", async () => {
		req.params.id = "5";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.params.permission = null;

		await deleteUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("deleteUserPermission deletes and returns 204 on success", async () => {
		req.params.id = "5";
		req.params.permission = "X";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(true);

		await deleteUserPermission(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("createUserPermission returns 400 when missing permission", async () => {
		req.params.id = "5";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body.permission = null;

		await createUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("createUserPermission returns 201 on success", async () => {
		req.params.id = "5";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body.permission = "X";

		await createUserPermission(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("forwards Internal server error when userValidator throws", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new Error("boom");
		});

		await getUsers(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Internal server error");
	});

	it("forwards AppError thrown by userValidator unchanged", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new AppError("Bad user", 401);
		});

		await getUsers(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Bad user");
	});

	it("getUser forwards AppError when id missing", async () => {
		req.params = {};

		await getUser(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid user id");
	});

	it("getUser forwards DB error to next", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getUser(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateUser forwards DB error to next", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body = { password: "p" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateUser(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateFullUser forwards DB error to next", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body = { username: "u", email: "e", password: "p" };
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateFullUser(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateUserPermission forwards AppError when userValidator throws", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new Error("boom");
		});

		await updateUserPermission(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Internal server error");
	});

	it("updateFullUserPermission forwards AppError when userValidator throws", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new Error("boom");
		});

		await updateFullUserPermission(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Internal server error");
	});

	it("deleteUserPermission returns 403 when not admin", async () => {
		req.params.id = "5";
		req.params.permission = "X";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await deleteUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("deleteUserPermission forwards DB error to next", async () => {
		req.params.id = "5";
		req.params.permission = "X";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await deleteUserPermission(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("createUserPermission returns 403 when not admin", async () => {
		req.params.id = "5";
		req.body.permission = "X";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await createUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("deleteUser forwards DB error to next", async () => {
		req.params.id = "42";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await deleteUser(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("getUserPermissions forwards DB error to next", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		req.params.id = "5";
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getUserPermissions(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("deleteUserPermission returns 400 when permission is array", async () => {
		req.params.id = "5";
		req.params.permission = ["a"] as any;
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(true);

		await deleteUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("createUserPermission forwards DB error to next", async () => {
		req.params.id = "5";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(true);
		req.body.permission = "X";
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await createUserPermission(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateUserPermission returns 401 when userId missing", async () => {
		(reqValidators.userValidator as any).mockReturnValue(0);

		await updateUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("updateFullUserPermission returns 401 when userId missing", async () => {
		(reqValidators.userValidator as any).mockReturnValue(0);

		await updateFullUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("updateUserPermission returns 403 when not admin", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await updateUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullUserPermission returns 403 when not admin", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(perm.hasGlobalPermission as any).mockResolvedValue(false);

		await updateFullUserPermission(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});
});
