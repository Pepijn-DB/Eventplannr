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
	createEvent,
	deleteEvent,
	getEvent,
	getEvents,
	updateEvent,
	updateFullEvent,
} from "../../src/controllers/v1/eventController.js";
import { AppError } from "../../src/middlewares/errorHandler.js";
import dbSvc from "../../src/services/databaseService.js";
import * as eTag from "../../src/services/eTagService.js";
import * as perm from "../../src/services/permissionService.js";
import * as reqValidators from "../../src/validators/requestValidator.js";
import * as resVal from "../../src/validators/resultValidator.js";
import * as varValidator from "../../src/validators/variableValidator.js";

describe("eventController", () => {
	let req: any;
	let res: any;
	let next: any;

	beforeEach(() => {
		vi.clearAllMocks();

		req = { params: {}, body: {}, rateLimit: {} };
		res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		next = vi.fn();

		(reqValidators.userValidator as any).mockReturnValue(7);
		(varValidator.variableValidator as any).mockReturnValue(false);
		(resVal.validateResult as any).mockImplementation(() => {});
	});

	it("getEvents returns rows", async () => {
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 1, title: "E" }] });

		await getEvents(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ result: [{ id: 1, title: "E" }] });
	});

	it("getEvent returns 200 and sets ETag", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "10";
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 10, title: "T" }] });
		(eTag.setETag as any).mockResolvedValue(undefined);

		await getEvent(req, res, next);

		expect(eTag.setETag).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ result: [{ id: 10, title: "T" }] });
	});

	it("createEvent returns 400 when missing title", async () => {
		req.body = { description: "d" };

		await createEvent(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Missing title" });
	});

	it("createEvent returns 201 on success", async () => {
		req.body = { title: "T", description: "D" };
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await createEvent(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({ message: "Event created" });
	});

	it("updateEvent returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateEvent(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateEvent returns 400 when nothing to update", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);

		req.body = {};

		await updateEvent(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Nothing to update" });
	});

	it("updateEvent returns 400 when status invalid", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "4";
		(perm.hasEventPermission as any).mockResolvedValue(true);

		req.body = { status: "BAD" };

		await updateEvent(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Invalid status" });
	});

	it("updateEvent updates fields and returns 204 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "5";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		req.body = { title: "New", description: "Desc", status: "OPEN" };

		await updateEvent(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
		expect(res.json).toHaveBeenCalled();
	});

	it("updateFullEvent returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "6";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateFullEvent(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullEvent returns 400 when request incomplete", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "7";
		(perm.hasEventPermission as any).mockResolvedValue(true);

		req.body = { title: "T" };

		await updateFullEvent(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Request is not complete",
		});
	});

	it("updateFullEvent returns 400 when status invalid", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "8";
		(perm.hasEventPermission as any).mockResolvedValue(true);

		req.body = { title: "T", description: "D", status: "BAD" };

		await updateFullEvent(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Invalid status" });
	});

	it("updateFullEvent calls ifMatchValidator and updates on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "9";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		req.body = { title: "T", description: "D", status: "OPEN" };

		await updateFullEvent(req, res, next);

		expect(reqValidators.ifMatchValidator).toHaveBeenCalled();
		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
		expect(res.json).toHaveBeenCalled();
	});

	it("deleteEvent returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "11";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await deleteEvent(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("deleteEvent performs all deletions and returns 204 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "12";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await deleteEvent(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(dbSvc.query).toHaveBeenCalledTimes(6);
		expect(res.status).toHaveBeenCalledWith(204);
		expect(res.json).toHaveBeenCalled();
	});

	it("forwards Internal server error when userValidator throws", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new Error("boom");
		});

		(varValidator.variableValidator as any).mockReturnValue(false);

		await getEvents(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Internal server error");
	});

	it("createEvent forwards error when query throws", async () => {
		req.body = { title: "T", description: "D" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await createEvent(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("getEvent forwards AppError when event_id missing or invalid", async () => {
		req.params = {};

		await getEvent(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid event_id");
	});

	it("updateEvent forwards AppError when event_id missing or invalid", async () => {
		req.params = {};

		await updateEvent(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid event_id");
	});

	it("updateFullEvent forwards AppError when event_id missing or invalid", async () => {
		req.params = {};

		await updateFullEvent(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid event_id");
	});

	it("deleteEvent forwards AppError when event_id missing or invalid", async () => {
		req.params = {};

		await deleteEvent(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid event_id");
	});
});
