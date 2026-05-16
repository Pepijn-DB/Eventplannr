/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "bun:test";

vi.mock("../../src/validators/requestValidator.js", () => ({
	ifMatchValidator: vi.fn(),
	userValidator: vi.fn(),
	eventValidator: vi.fn(),
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
	createDateResponse,
	createLocationResponse,
	deleteDateResponse,
	deleteLocationResponse,
	getAllDateResponses,
	getAllLocationResponses,
	getDateResponse,
	getLocationResponse,
	updateDateResponse,
	updateFullDateResponse,
	updateFullLocationResponse,
	updateLocationResponse,
} from "../../src/controllers/v1/responseController.js";
import { AppError } from "../../src/middlewares/errorHandler.js";
import dbSvc from "../../src/services/databaseService.js";
import * as eTag from "../../src/services/eTagService.js";
import * as perm from "../../src/services/permissionService.js";
import * as reqValidators from "../../src/validators/requestValidator.js";
import * as resVal from "../../src/validators/resultValidator.js";
import * as varValidator from "../../src/validators/variableValidator.js";

describe("responseController", () => {
	let req: any;
	let res: any;
	let next: any;

	beforeEach(() => {
		vi.clearAllMocks();

		req = { params: {}, body: {}, path: "/", rateLimit: {} };
		res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		next = vi.fn();

		(reqValidators.userValidator as any).mockReturnValue(42);
		(reqValidators.eventValidator as any).mockReturnValue(7);
		(varValidator.variableValidator as any).mockImplementation(
			(v: any) => v !== undefined && v !== null,
		);
		(resVal.validateResult as any).mockImplementation(() => {});
	});

	it("createDateResponse forwards Forbidden when invitation not present", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [] });

		await createDateResponse(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Forbidden");
	});

	it("createDateResponse returns 400 when state missing", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "42";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 10 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await createDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid state",
		});
	});

	it("createDateResponse returns 201 on success", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "42";
		req.body = { state: "YES" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 10 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await createDateResponse(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({ message: "Date response created" });
	});

	it("getDateResponse returns 403 when no permission", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getDateResponse returns 200 and sets ETag on success", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 11 }] });
		(eTag.setETag as any).mockResolvedValue(undefined);

		await getDateResponse(req, res, next);

		expect(eTag.setETag).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ result: [{ id: 11 }] });
	});

	it("updateDateResponse returns 400 when state missing", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 20 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await updateDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid state",
		});
	});

	it("updateDateResponse returns 204 on success", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		req.body = { state: "NO" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 20 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateDateResponse(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("updateFullDateResponse returns 400 when state missing", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 21 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await updateFullDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("updateFullDateResponse returns 404 when date response not found", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		req.body = { state: "YES" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 21 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [] });

		await updateFullDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({
			message: "Date response not found",
		});
	});

	it("updateFullDateResponse calls ifMatchValidator and returns 204 on success", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		req.body = { state: "YES" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 21 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 30 }] });
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateFullDateResponse(req, res, next);

		expect(reqValidators.ifMatchValidator).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("deleteDateResponse returns 204 on success", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 40 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await deleteDateResponse(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("createLocationResponse returns 400 when state missing", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 50 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await createLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("createLocationResponse returns 201 on success", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		req.body = { state: "YES" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 50 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await createLocationResponse(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("getLocationResponse returns 403 when no permission", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("getLocationResponse returns 200 and sets ETag on success", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 60 }] });
		(eTag.setETag as any).mockResolvedValue(undefined);

		await getLocationResponse(req, res, next);

		expect(eTag.setETag).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("deleteLocationResponse returns 204 on success", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 70 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await deleteLocationResponse(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("updateLocationResponse returns 400 when state missing", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 80 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await updateLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("updateLocationResponse returns 204 on success", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		req.body = { state: "NO" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 80 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await updateLocationResponse(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("updateFullLocationResponse returns 500 when idResult null", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		req.body = { state: "NO" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 90 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce(null);

		await updateFullLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
	});

	it("updateFullLocationResponse returns 404 when not found", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		req.body = { state: "NO" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 90 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [] });

		await updateFullLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
	});

	it("updateFullLocationResponse calls ifMatchValidator and returns 204 on success", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		req.body = { state: "NO" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 90 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 100 }] });
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateFullLocationResponse(req, res, next);

		expect(reqValidators.ifMatchValidator).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("getAllDateResponses returns 403 when no permission", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(reqValidators.eventValidator as any).mockReturnValue(9);
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getAllDateResponses(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("getAllDateResponses returns 200 on success", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(reqValidators.eventValidator as any).mockReturnValue(9);
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ date_id: 1 }] });

		await getAllDateResponses(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("getAllLocationResponses returns 400 when event missing", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(reqValidators.eventValidator as any).mockReturnValue(null);

		await getAllLocationResponses(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Missing event id" });
	});

	it("getAllLocationResponses returns 403 when no permission", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(reqValidators.eventValidator as any).mockReturnValue(9);
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getAllLocationResponses(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
	});

	it("getAllLocationResponses returns 200 on success", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(reqValidators.eventValidator as any).mockReturnValue(9);
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ name: "L" }] });

		await getAllLocationResponses(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("forwards Internal server error when userValidator throws", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new Error("boom");
		});

		await getAllDateResponses(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(Error);
		expect((err as any).message).toBe("boom");
	});

	it("forwards AppError thrown by userValidator unchanged", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new AppError("Bad user", 401);
		});

		await getAllDateResponses(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Bad user");
	});

	it("createDateResponse forwards AppError when event and user missing", async () => {
		(reqValidators.eventValidator as any).mockReturnValue(null);
		req.params = {};

		await createDateResponse(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toContain("Missing or invalid");
	});

	it("createDateResponse forwards AppError when date id missing (needsId)", async () => {
		(reqValidators.eventValidator as any).mockReturnValue(5);
		(reqValidators.userValidator as any).mockReturnValue(42);
		req.path = "/date";
		req.params = { user_id: "42" };

		await createDateResponse(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing date id");
	});

	it("createDateResponse forwards AppError when id is NaN", async () => {
		(reqValidators.eventValidator as any).mockReturnValue(5);
		(reqValidators.userValidator as any).mockReturnValue(42);
		req.path = "/date";
		req.params = { user_id: "6", date_id: "notnum" };

		await createDateResponse(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid request parameters");
	});

	it("getInvitationId throws Internal server error when rows[0].id getter throws", async () => {
		req.path = "/date";
		req.params = { user_id: "6", date_id: "5" };
		(reqValidators.eventValidator as any).mockReturnValue(2);
		const badRow: any = {};
		Object.defineProperty(badRow, "id", {
			get() {
				throw new Error("bad-get");
			},
		});
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [badRow] });

		await createDateResponse(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Internal server error");
	});

	it("createDateResponse returns 403 when not permitted and requestedUser differs", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 200 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await createDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateDateResponse returns 403 when not permitted and requestedUser differs", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 201 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("deleteDateResponse returns 403 when not permitted and requestedUser differs", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 202 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await deleteDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("createLocationResponse returns 403 when not permitted and requestedUser differs", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 203 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await createLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("deleteLocationResponse returns 403 when not permitted and requestedUser differs", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 204 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await deleteLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateLocationResponse returns 403 when not permitted and requestedUser differs", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 205 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullLocationResponse returns 403 when not permitted and requestedUser differs", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 206 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateFullLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullDateResponse returns 500 when update result null", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";
		req.body = { state: "YES" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 21 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 30 }] });
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		(dbSvc.query as any).mockResolvedValueOnce(null);

		await updateFullDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
	});

	it("updateFullLocationResponse returns 500 when update result null", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		req.body = { state: "NO" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 90 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 100 }] });
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		(dbSvc.query as any).mockResolvedValueOnce(null);

		await updateFullLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
	});

	it("updateFullDateResponse returns 403 when not permitted and requestedUser differs", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "99";
		(reqValidators.userValidator as any).mockReturnValue(42);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 210 }] });
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateFullDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullLocationResponse returns 400 when state missing", async () => {
		req.path = "/location";
		req.params.location_id = "8";
		req.params.user_id = "6";
		(reqValidators.userValidator as any).mockReturnValue(6);
		(reqValidators.eventValidator as any).mockReturnValue(2);
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await updateFullLocationResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid state",
		});
	});

	it("createDateResponse uses body.user_id when present", async () => {
		req.path = "/date";
		req.params.date_id = "5";
		req.body = { user_id: "77", state: "YES" };
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 300 }] });
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await createDateResponse(req, res, next);

		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("createDateResponse forwards AppError when userValidator throws inside getRequestVariables", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new Error("boom");
		});
		req.path = "/date";
		req.params.date_id = "5";
		req.params.user_id = "6";

		await createDateResponse(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Internal server error");
	});

	it("createDateResponse forwards AppError when user id is 0 (missing) in params", async () => {
		req.path = "/date";
		req.params = { date_id: "5", user_id: "0" };
		(reqValidators.eventValidator as any).mockReturnValue(5);

		await createDateResponse(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid user id");
	});

	it("createDateResponse rethrows AppError from getInvitationId", async () => {
		req.path = "/date";
		req.params = { date_id: "5", user_id: "6" };
		const badRow: any = {};
		Object.defineProperty(badRow, "id", {
			get() {
				throw new AppError("Denied", 401);
			},
		});
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [badRow] });

		await createDateResponse(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Denied");
	});

	it("getDateResponse forwards DB error to next", async () => {
		req.path = "/date";
		req.params = { date_id: "5", user_id: "6" };
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getDateResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateDateResponse forwards DB error to next", async () => {
		req.path = "/date";
		req.params = { date_id: "5", user_id: "6" };
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateDateResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateFullDateResponse forwards DB error to next", async () => {
		req.path = "/date";
		req.params = { date_id: "5", user_id: "6" };
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateFullDateResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("deleteDateResponse forwards DB error to next", async () => {
		req.path = "/date";
		req.params = { date_id: "5", user_id: "6" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await deleteDateResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("createLocationResponse forwards DB error to next", async () => {
		req.path = "/location";
		req.params = { location_id: "8", user_id: "6" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await createLocationResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("getLocationResponse forwards DB error to next", async () => {
		req.path = "/location";
		req.params = { location_id: "8", user_id: "6" };
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getLocationResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("deleteLocationResponse forwards DB error to next", async () => {
		req.path = "/location";
		req.params = { location_id: "8", user_id: "6" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await deleteLocationResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateLocationResponse forwards DB error to next", async () => {
		req.path = "/location";
		req.params = { location_id: "8", user_id: "6" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateLocationResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateFullLocationResponse forwards DB error to next", async () => {
		req.path = "/location";
		req.params = { location_id: "8", user_id: "6" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateFullLocationResponse(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("getAllLocationResponses forwards DB error to next", async () => {
		(reqValidators.userValidator as any).mockReturnValue(42);
		(reqValidators.eventValidator as any).mockReturnValue(9);
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getAllLocationResponses(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});
});
