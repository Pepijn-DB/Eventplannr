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
	default: { query: vi.fn() },
}));

vi.mock("../../src/services/permissionService.js", () => ({
	hasEventPermission: vi.fn(),
	hasLocationPermission: vi.fn(),
}));

vi.mock("../../src/services/eTagService.js", () => ({
	setETag: vi.fn(),
}));

import {
	createEventLocation,
	createLocation,
	deleteEventLocation,
	deleteLocation,
	getEventLocation,
	getEventLocations,
	getLocation,
	getLocations,
	updateEventLocation,
	updateFullEventLocation,
	updateFullLocation,
	updateLocation,
} from "../../src/controllers/v1/locationController.js";
import { AppError } from "../../src/middlewares/errorHandler.js";
import dbSvc from "../../src/services/databaseService.js";
import * as eTag from "../../src/services/eTagService.js";
import * as perm from "../../src/services/permissionService.js";
import * as reqValidators from "../../src/validators/requestValidator.js";
import * as resVal from "../../src/validators/resultValidator.js";
import * as varValidator from "../../src/validators/variableValidator.js";

describe("locationController", () => {
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

	it("getLocations returns 200 on success", async () => {
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 1, name: "A" }] });

		await getLocations(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ result: [{ id: 1, name: "A" }] });
	});

	it("getLocations forwards DB error to next", async () => {
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getLocations(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("getLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "2";
		(perm.hasLocationPermission as any).mockResolvedValue(false);

		await getLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getLocation returns 200 and sets ETag on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "2";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 2, name: "L" }] });
		(eTag.setETag as any).mockResolvedValue(undefined);

		await getLocation(req, res, next);

		expect(eTag.setETag).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ result: [{ id: 2, name: "L" }] });
	});

	it("deleteLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "3";
		(perm.hasLocationPermission as any).mockResolvedValue(false);

		await deleteLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("deleteLocation deletes and returns 204 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "3";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await deleteLocation(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("createLocation returns 400 when name missing", async () => {
		req.body = {};

		await createLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Missing location name" });
	});

	it("createLocation returns 201 on success", async () => {
		req.body = { name: "Place" };
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await createLocation(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({
			message: "Location created successfully",
		});
	});

	it("updateLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "4";
		(perm.hasLocationPermission as any).mockResolvedValue(false);

		await updateLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateLocation returns 400 when missing name", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "4";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		req.body = {};

		await updateLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Missing location name" });
	});

	it("updateLocation updates and returns 204 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "4";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		req.body = { name: "New" };
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateLocation(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("updateFullLocation calls ifMatchValidator and updates on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "4";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		req.body = { name: "Full" };
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateFullLocation(req, res, next);

		expect(reqValidators.ifMatchValidator).toHaveBeenCalled();
		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("getEventLocations returns 400 when event_id missing", async () => {
		req.params = {};

		await getEventLocations(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid event id",
		});
	});

	it("getEventLocations returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "10";
		req.params.location_id = "1";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getEventLocations(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getEventLocations returns 200 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "10";
		req.params.location_id = "1";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 1, name: "L" }] });

		await getEventLocations(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ result: [{ id: 1, name: "L" }] });
	});

	it("getEventLocation returns 400 when event_id missing", async () => {
		req.params = { location_id: "1" };

		await getEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid event id",
		});
	});

	it("getEventLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "10";
		req.params.location_id = "2";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getEventLocation returns 200 and sets ETag on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "10";
		req.params.location_id = "2";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 5, name: "Loc" }] });
		(eTag.setETag as any).mockResolvedValue(undefined);

		await getEventLocation(req, res, next);

		expect(eTag.setETag).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({ result: [{ id: 5, name: "Loc" }] });
	});

	it("createEventLocation returns 400 when missing params", async () => {
		req.params = {};

		await createEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("createEventLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "1";
		req.body = { location_id: "2" };
		req.params.location_id = "1";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await createEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("createEventLocation returns 201 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "1";
		req.body = { location_id: "2" };
		req.params.location_id = "1";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await createEventLocation(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(201);
	});

	it("createEventLocation returns 400 when location_id missing or invalid", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "1";
		req.params.location_id = "1";

		await createEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid location id",
		});
	});

	it("deleteEventLocation returns 400 when event_id missing", async () => {
		req.params = { location_id: "1" };

		await deleteEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("deleteEventLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await deleteEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("deleteEventLocation returns 404 when event location not found", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await deleteEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({
			message: "Event location not found",
		});
	});

	it("deleteEventLocation deletes and returns 204 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValueOnce({ rows: [{ id: 7 }] });
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await deleteEventLocation(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(204);
	});

	it("updateEventLocation returns 405 when implemented path", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "1";
		(perm.hasEventPermission as any).mockResolvedValue(true);

		await updateEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(405);
		expect(res.json).toHaveBeenCalledWith({
			message: "Method not implemented.",
		});
	});

	it("updateEventLocation returns 400 when event_id missing", async () => {
		req.params = { location_id: "1" };

		await updateEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid event id",
		});
	});

	it("updateEventLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "1";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullEventLocation returns 500 when idResult null", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue(null);

		await updateFullEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
	});

	it("updateFullEventLocation returns 404 when not found", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await updateFullEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({
			message: "Event location not found",
		});
	});

	it("updateFullEventLocation calls ifMatchValidator and returns 405 on success", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [{ id: 9 }] });
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);

		await updateFullEventLocation(req, res, next);

		expect(reqValidators.ifMatchValidator).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(405);
	});

	it("updateFullEventLocation returns 400 when event_id missing", async () => {
		req.params = { location_id: "3" };

		await updateFullEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Missing or invalid event id",
		});
	});

	it("updateFullEventLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await updateFullEventLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getLocation forwards DB error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "2";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("getLocation forwards AppError when location_id invalid (getRequestVariables)", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);

		await getLocation(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Missing or invalid location id");
	});

	it("deleteLocation forwards DB error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "3";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await deleteLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("createLocation forwards DB error to next", async () => {
		req.body = { name: "Place" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await createLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateLocation forwards DB error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "4";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		req.body = { name: "New" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateFullLocation forwards DB error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "4";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		req.body = { name: "Full" };
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateFullLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateFullLocation returns 403 when no permission", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "4";
		(perm.hasLocationPermission as any).mockResolvedValue(false);

		await updateFullLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullLocation returns 400 when missing name", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.location_id = "4";
		(perm.hasLocationPermission as any).mockResolvedValue(true);
		req.body = {};

		await updateFullLocation(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Missing location name" });
	});

	it("getEventLocations forwards DB error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "10";
		req.params.location_id = "1";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getEventLocations(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("getEventLocation forwards DB error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "10";
		req.params.location_id = "2";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await getEventLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("createEventLocation forwards DB error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "1";
		req.params.location_id = "1";
		req.body = { location_id: "2" };
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await createEventLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("deleteEventLocation forwards DB error to next when selecting event location throws", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await deleteEventLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateEventLocation forwards error when permission check throws", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "1";
		const err = new Error("perm");
		(perm.hasEventPermission as any).mockRejectedValue(err);

		await updateEventLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("updateFullEventLocation forwards DB error to next", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		await updateFullEventLocation(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("deleteEventLocation outer catch calls next when inner next throws", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "3";
		(perm.hasEventPermission as any).mockResolvedValue(true);
		const err = new Error("db");
		(dbSvc.query as any).mockRejectedValue(err);

		let first = true;
		const throwingNext = vi.fn((e: any) => {
			if (first) {
				first = false;
				throw e;
			}
			return undefined;
		});

		await deleteEventLocation(req, res, throwingNext as any);

		expect(throwingNext).toHaveBeenCalledTimes(2);
	});

	it("updateEventLocation outer catch calls next when inner next throws", async () => {
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.event_id = "2";
		req.params.location_id = "1";
		const permErr = new Error("perm");
		(perm.hasEventPermission as any).mockRejectedValue(permErr);

		let first = true;
		const throwingNext = vi.fn((e: any) => {
			if (first) {
				first = false;
				throw e;
			}
			return undefined;
		});

		await updateEventLocation(req, res, throwingNext as any);

		expect(throwingNext).toHaveBeenCalledTimes(2);
	});

	it("forwards Internal server error when userValidator throws", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new Error("boom");
		});

		await getLocations(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Internal server error");
	});

	it("forwards AppError thrown by userValidator unchanged", async () => {
		(reqValidators.userValidator as any).mockImplementation(() => {
			throw new AppError("Bad user", 401);
		});

		await getLocations(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
		expect((err as any).message).toBe("Bad user");
	});
});
