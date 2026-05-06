import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";

import { getErrors } from "../../middlewares/errorHandler.js";
import { Global } from "../../models/permissions.js";
import { needsGlobalPermission } from "../../services/permissionService.js";
import { userValidator } from "../../validators/requestValidator.js";

export const getLogs = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);

		await needsGlobalPermission(userId, Global.ADMIN_ALL);

		return res.status(200).json({ errors: getErrors() });
	} catch (err) {
		next(err);
	}
};
