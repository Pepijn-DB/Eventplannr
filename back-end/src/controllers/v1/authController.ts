import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthRequest } from "../../app.js";
import Config from "../../config/config.js";

import { AppError } from "../../middlewares/errorHandler.js";
import type { User } from "../../models/user.js";
import { queryWithoutExecutioner } from "../../services/databaseService.js";
import { emailValidator } from "../../validators/emailValidator.js";
import {
	arrayValidator,
	variableValidator,
} from "../../validators/variableValidator.js";

export const getToken = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (Config.secret === "null") {
			next(new AppError("Server not configured", 500));
			return;
		}

		if (variableValidator(req.body))
			return res.status(400).json({ message: "Missing body" });
	} catch (error) {
		next(error);
	}
	try {
		const { email, password } = req.body;

		if (!arrayValidator([email, password]))
			return res.status(400).json({ message: "Missing email or password" });
		else if (!emailValidator(email)) {
			return res.status(400).json({ message: "Invalid email" });
		}

		const queryResult = await queryWithoutExecutioner(
			"SELECT * FROM users WHERE email = ? AND password = ?",
			[email, password],
		);
		if (queryResult === null) throw new AppError("Unauthorized", 401);
		const user = queryResult.rows[0];

		const payload: User = {
			id: user.id,
			username: user.username,
			email: user.email,
		};

		const token = jwt.sign(payload, Config.secret, {
			expiresIn: "1d",
		});

		res.status(200).json({ token: token });
	} catch (error) {
		next(error);
	}
};
