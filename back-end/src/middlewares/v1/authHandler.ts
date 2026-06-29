import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequest } from "../../app.js";
import Config from "../../config/config.js";
import type { User } from "../../models/user.js";

const noAuthRequired: { [key: string]: string } = {
	"/api/v1/auth/token": "POST",
	"/api/v1/auth/refresh": "POST",
	"/api/v1/auth/logout": "POST",
	"/api/v1/user": "POST",
};

export const checkToken = (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	//Skip checking token for routes that don't require authentication
	if (req.path in noAuthRequired && req.method === noAuthRequired[req.path]) {
		return next();
	}

	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).json({
			message: "Unauthorized. No token provided.",
		});
	}

	const token = authHeader?.split(" ")[1];

	if (!token) {
		return res.status(401).json({
			message: "Unauthorized. No (valid) token provided.",
		});
	}

	try {
		req.user = jwt.verify(token, Config.secret) as User;
		next();
	} catch (_error) {
		return res.status(403).json({
			message: "Forbidden - Invalid or expired token",
		});
	}
};
