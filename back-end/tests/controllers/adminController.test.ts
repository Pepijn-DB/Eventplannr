/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/permissionService.js", () => ({
	hasGlobalPermission: vi.fn(),
}));

vi.mock("../../src/middlewares/errorHandler.js", () => ({
	getErrors: vi.fn(),
}));

vi.mock("../../src/validators/requestValidator.js", () => ({
	userValidator: vi.fn(),
}));

import { getLogs } from "../../src/controllers/v1/adminController.js";
import { getErrors } from "../../src/middlewares/errorHandler.js";
import { hasGlobalPermission } from "../../src/services/permissionService.js";
import { userValidator } from "../../src/validators/requestValidator.js";

describe("adminController.getLogs", () => {
	let req: any;
	let res: any;
	let next: any;

	beforeEach(() => {
		req = { user: { id: 1 } };
		res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
		next = vi.fn();
		vi.clearAllMocks();
	});

	it("returns 200 and errors when user has ADMIN_ALL", async () => {
		(userValidator as any).mockImplementation(() => 1);
		(hasGlobalPermission as any).mockResolvedValue(true);
		(getErrors as any).mockReturnValue([{ err: { message: "e" }, req: {} }]);

		await getLogs(req, res, next);

		expect(hasGlobalPermission).toHaveBeenCalledWith(1, expect.anything());
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			errors: [{ err: { message: "e" }, req: {} }],
		});
		expect(next).not.toHaveBeenCalled();
	});

	it("returns 403 when user lacks ADMIN_ALL", async () => {
		(userValidator as any).mockImplementation(() => 2);
		(hasGlobalPermission as any).mockResolvedValue(false);

		await getLogs(req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
		expect(next).not.toHaveBeenCalled();
	});

	it("calls next when userValidator throws", async () => {
		const err = new Error("no user");
		(userValidator as any).mockImplementation(() => {
			throw err;
		});

		await getLogs(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});

	it("calls next when hasGlobalPermission rejects", async () => {
		const err = new Error("boom");
		(userValidator as any).mockImplementation(() => 1);
		(hasGlobalPermission as any).mockRejectedValue(err);

		await getLogs(req, res, next);

		expect(next).toHaveBeenCalledWith(err);
	});
});
