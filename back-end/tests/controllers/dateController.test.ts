/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/validators/requestValidator.js", () => ({
	eventValidator: vi.fn(),
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
	createEventDate,
	deleteEventDate,
	getEventDate,
	getEventDates,
	updateEventDate,
	updateFullEventDate,
} from "../../src/controllers/v1/dateController.js";
import { AppError } from "../../src/middlewares/errorHandler.js";
import dbSvc from "../../src/services/databaseService.js";
import * as eTag from "../../src/services/eTagService.js";
import * as perm from "../../src/services/permissionService.js";
import * as reqValidators from "../../src/validators/requestValidator.js";
import * as resVal from "../../src/validators/resultValidator.js";
import * as varValidator from "../../src/validators/variableValidator.js";

describe("dateController", () => {
	let req: any;
	let res: any;
	let next: any;

	beforeEach(() => {
		vi.clearAllMocks();

		req = { params: {}, body: {}, rateLimit: {} };
		res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		next = vi.fn();

		(reqValidators.userValidator as any).mockReturnValue(1);
		(reqValidators.eventValidator as any).mockReturnValue(2);
		(varValidator.variableValidator as any).mockReturnValue(false);
		(resVal.validateResult as any).mockImplementation(() => {});
	});

	it("getEventDates returns results when permission granted", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(dbSvc.query as any).mockResolvedValue({
			rows: [{ id: 5, date: "2020-01-01" }],
		});

		await getEventDates(req, res, next);

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
			result: [{ id: 5, date: "2020-01-01" }],
		});
	});

	it("getEventDates returns 403 when no permission", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await getEventDates(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("createEventDate returns 403 when no permission", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(false);

		await createEventDate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("createEventDate returns 400 when date invalid (variableValidator false)", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(false);

		req.body = { date: "not-a-date" };

		await createEventDate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Invalid date" });
	});

	it("createEventDate returns 400 when date string produces NaN date", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(true);

		req.body = { date: "bad-date" };
		req.params.date_id = "1";

		await createEventDate(req, res, next);

		if (!(res.status as any).mock.calls.length) {
			expect(next).toHaveBeenCalled();
			const err = (next as any).mock.calls[0][0];
			throw (
				err ??
				new Error("expected res.status to be called or next to have an error")
			);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Invalid date" });
	});

	it("createEventDate returns 201 on success", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(true);
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		req.body = { date: "2020-01-01" };
		req.params.date_id = "1";

		await createEventDate(req, res, next);

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
		expect(res.json).toHaveBeenCalledWith({ message: "Date created" });
	});

	it("deleteEventDate returns 403 when no permission", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(false);
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.date_id = "1";

		await deleteEventDate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("deleteEventDate deletes and returns 204 on success", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.date_id = "3";
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await deleteEventDate(req, res, next);

		expect(dbSvc.query).toHaveBeenCalled();
		expect(dbSvc.query).toHaveBeenCalledTimes(2);
		expect(res.status).toHaveBeenCalledWith(204);
		expect(res.json).toHaveBeenCalled();
	});

	it("updateEventDate returns 403 when no permission", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(false);
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.date_id = "1";

		await updateEventDate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateEventDate returns 405 when implemented not present and permission granted", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.date_id = "1";

		await updateEventDate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(405);
		expect(res.json).toHaveBeenCalledWith({
			message: "Method not implemented.",
		});
	});

	it("updateFullEventDate returns 403 when no permission", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(false);
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.date_id = "1";

		await updateFullEventDate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("updateFullEventDate calls ifMatchValidator and returns 405 when permission granted", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(true);
		(reqValidators.ifMatchValidator as any).mockResolvedValue(undefined);
		req.params.date_id = "2";

		await updateFullEventDate(req, res, next);

		expect(reqValidators.ifMatchValidator).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(405);
		expect(res.json).toHaveBeenCalledWith({
			message: "Method not implemented.",
		});
	});

	it("getEventDate returns 403 when no permission", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(false);
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.date_id = "1";

		await getEventDate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
	});

	it("getEventDate returns 500 when no rows returned", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.date_id = "9";
		(dbSvc.query as any).mockResolvedValue({ rows: [] });

		await getEventDate(req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
	});

	it("getEventDate returns 200 and sets ETag on success", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(true);
		req.params.date_id = "10";
		(dbSvc.query as any).mockResolvedValue({
			rows: [{ id: 10, date: "2020-01-01" }],
		});
		(eTag.setETag as any).mockResolvedValue(undefined);

		await getEventDate(req, res, next);

		expect(eTag.setETag).toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			result: [{ id: 10, date: "2020-01-01" }],
		});
	});

	it("getEventDate passes AppError to next when date_id invalid", async () => {
		(perm.hasEventPermission as any).mockResolvedValue(true);
		(varValidator.variableValidator as any).mockReturnValue(false);
		req.params.date_id = "not-a-number";

		await getEventDate(req, res, next);

		expect(next).toHaveBeenCalled();
		const err = (next as any).mock.calls[0][0];
		expect(err).toBeInstanceOf(AppError);
	});

	const fnMap: Record<string, any> = {
		getEventDates,
		createEventDate,
		deleteEventDate,
		updateEventDate,
		updateFullEventDate,
		getEventDate,
	};

	for (const fnName of Object.keys(fnMap)) {
		it(`${fnName} forwards Internal server error when userValidator throws`, async () => {
			(reqValidators.userValidator as any).mockImplementation(() => {
				throw new Error("boom");
			});

			(perm.hasEventPermission as any).mockResolvedValue(true);
			(varValidator.variableValidator as any).mockReturnValue(false);

			await fnMap[fnName](req, res, next);

			expect(next).toHaveBeenCalled();
			const err = (next as any).mock.calls[0][0];
			expect(err).toBeInstanceOf(AppError);
			expect((err as any).message).toBe("Internal server error");
		});
	}
});
