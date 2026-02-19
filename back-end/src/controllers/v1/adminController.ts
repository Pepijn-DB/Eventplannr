import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";

import { getErrors } from "../../middlewares/errorHandler.js";
import { Global } from "../../models/permissions.js";
import { hasGlobalPermission } from "../../services/permissionService.js";
import { userValidator } from "../../validators/requestValidator.js";

export const getLogs = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		if (await hasGlobalPermission(userId, Global.ADMIN_ALL)) {
			return res.status(200).json(getErrors);
		} else {
			return res.status(403).json({ message: "Forbidden" });
		}
	} catch (err) {
		next(err);
	}
};
