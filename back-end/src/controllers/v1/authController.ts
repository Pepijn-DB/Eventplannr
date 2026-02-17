import bcrypt from "bcrypt";
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
	} catch (err) {
		next(err);
	}
	try {
		const { email, password } = req.body;

		if (!arrayValidator([email, password]))
			return res.status(400).json({ message: "Missing email or password" });
		else if (!emailValidator(email)) {
			return res.status(400).json({ message: "Invalid email" });
		}

		const queryResult = await queryWithoutExecutioner(
			"SELECT * FROM users WHERE email = ?",
			[email],
		);
		if (!queryResult || queryResult.rows.length === 0) {
			return res.status(401).json({ message: "Unauthorized" });
		}
		const user = queryResult.rows[0];

		const passwordMatch = await bcrypt.compare(password as string, user.password_hash);
		if (!passwordMatch) {
			return res.status(401).json({ message: "Unauthorized" });
		}

		const payload: User = {
			id: user.id,
			username: user.username,
			email: user.email,
		};

		const token = jwt.sign(payload, Config.secret, {
			expiresIn: "1d",
		});

		res.status(200).json({ token: token });
	} catch (err) {
		next(err);
	}
};
