/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "vitest";

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
	default: { query: vi.fn() },
}));

vi.mock("../../src/services/permissionService.js", () => ({
	hasEventPermission: vi.fn(),
}));

vi.mock("../../src/services/eTagService.js", () => ({
	setETag: vi.fn(),
}));

import {
	createInvitation,
	deleteInvitation,
	getInvitation,
	getInvitations,
	getUserInvitations,
	updateFullInvitation,
	updateInvitation,
} from "../../src/controllers/v1/invitationController.js";
import { AppError } from "../../src/middlewares/errorHandler.js";
import dbSvc from "../../src/services/databaseService.js";
import * as eTag from "../../src/services/eTagService.js";
import * as perm from "../../src/services/permissionService.js";
import * as reqValidators from "../../src/validators/requestValidator.js";
import * as resVal from "../../src/validators/resultValidator.js";
import * as varValidator from "../../src/validators/variableValidator.js";

describe("invitationController", () => {
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

	it("getInvitations returns 200 when permitted", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "3";
		req.params.invitation_id = null;
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({
			rows: [{ user_id: 1, event_id: 3, role: "GUEST" }],
		});

		await getInvitations(req, res, next);

		if (!(res.status as any).mock.calls.length) {
			expect(next).toHaveBeenCalled();
			const err = (next as any).mock.calls[0][0];
			throw (
				err ??
				new Error("expected res.status to be called or next to have an error")
			);
		}

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			result: [{ user_id: 1, event_id: 3, role: "GUEST" }],
		});
	});

	it("getInvitations returns 403 when not permitted", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "3";
		req.params.invitation_id = null;
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getInvitations(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getUserInvitations returns 400 when id invalid", async () => {
		req.params.id = "notnum";

		await getUserInvitations(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid user id",
		});
	});

	it("getUserInvitations returns 200 when valid", async () => {
		req.params.id = "5";
		(varValidator.variableValidator as any).mockReturnValue(true);
		(dbSvc.query as any).mockResolvedValue({
			rows: [{ user_id: 5, event_id: 1 }],
		});

		await getUserInvitations(req, res, next);

		if (!(res.status as any).mock.calls.length) {
			expect(next).toHaveBeenCalled();
			const err = (next as any).mock.calls[0][0];
			throw (
				err ??
				new Error("expected res.status to be called or next to have an error")
			);
		}

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			result: [{ user_id: 5, event_id: 1 }],
		});
	});

	it("deleteInvitation returns 403 when user lacks permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "7";
		req.params.invitation_id = "8";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 7 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await deleteInvitation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("deleteInvitation deletes and returns 204 when permitted", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "7";
		req.params.invitation_id = "8";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 7 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await deleteInvitation(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(dbSvc.query).toHaveBeenCalledTimes(4);
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("createInvitation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = null;
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await createInvitation(req, res, next);

		if (!(res.status as any).mock.calls.length) {
			expect(next).toHaveBeenCalled();
			const err = (next as any).mock.calls[0][0];
			throw (
				err ??
				new Error("expected res.status to be called or next to have an error")
			);
		}

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("createInvitation creates and returns 201 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = null;
		(perm.hasEventPermission as any).mockResolvedValue(true);
		req.body = { userId: 9, role: "ADMIN" };
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await createInvitation(req, res, next);

		if (!(res.status as any).mock.calls.length) {
			expect(next).toHaveBeenCalled();
			const err = (next as any).mock.calls[0][0];
			throw (
				err ??
				new Error("expected res.status to be called or next to have an error")
			);
		}

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({ message: "Invitation created" });
	});

	it("updateInvitation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateInvitation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateInvitation returns 400 when nothing to update", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		req.body = {};

		await updateInvitation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Nothing to update" });
	});

	it("updateInvitation updates and returns 204 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		req.body = { role: "GUEST" };
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateInvitation(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("updateFullInvitation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateFullInvitation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullInvitation returns 400 when nothing to update", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		req.body = {};

		await updateFullInvitation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Nothing to update" });
	});

	it("updateFullInvitation calls ifMatchValidator and updates on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		req.body = { role: "GUEST" };
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateFullInvitation(req, res, next);

		expect(reqValidators.ifMatchValidator).toHaveBeenCalled();
		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("getInvitation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getInvitation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getInvitation returns 400 when invitation not found", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [] });

		await getInvitation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Invitation not found" });
	});

	it("getInvitation returns 200 and sets ETag on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ user_id: 99 }] });
		(dbSvc.query as any).mockResolvedValueOnce({
			rows: [{ id: 3, user_id: 99, event_id: 2 }],
		});
		(eTag.setETag as any).mockResolvedValue(undefined);

		await getInvitation(req, res, next);

		expect(eTag.setETag).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			result: [{ id: 3, user_id: 99, event_id: 2 }],
		});
	});

	it("forwards Internal server error when userValidator throws", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new Error("boom");
		});
		(varValidator.variableValidator as any).mockReturnValue(false);

		await getInvitations(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Internal server error");
	});

	it("forwards AppError thrown by userValidator unchanged", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new AppError("Bad user", 401);
		});
		(varValidator.variableValidator as any).mockReturnValue(false);

		await getInvitations(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Bad user");
	});

	it("getInvitations forwards AppError when event_id missing or invalid", async () => {
		req.params = {};

		await getInvitations(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid event id");
	});

	it("deleteInvitation forwards AppError when invitation_id missing or invalid", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "1";

		await deleteInvitation(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid invitation id");
	});

	it("getUserInvitations forwards query error to next", async () => {
		req.params.id = "5";
		(varValidator.variableValidator as any).mockReturnValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getUserInvitations(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("deleteInvitation forwards query error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "7";
		req.params.invitation_id = "8";
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await deleteInvitation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("createInvitation forwards query error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = null;
		(perm.hasEventPermission as any).mockResolvedValue(true);
		req.body = { userId: 9, role: "ADMIN" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await createInvitation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateInvitation forwards query error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		req.body = { role: "GUEST" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateInvitation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateFullInvitation forwards query error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		req.body = { role: "GUEST" };
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateFullInvitation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("getInvitation forwards query error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.invitation_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getInvitation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});
});
