import * as Bun from "bun";
import { createHash, randomBytes } from "node:crypto";
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

const REFRESH_TOKEN_TTL_DAYS = 7;
const ACCESS_TOKEN_TTL = "15m";

function hashToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

async function generateRefreshToken(userId: number): Promise<string> {
	const raw = randomBytes(48).toString("hex");
	const hash = hashToken(raw);

	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

	await queryWithoutExecutioner(
		"INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
		[userId, hash, expiresAt.toISOString().slice(0, 19).replace("T", " ")],
	);

	return raw;
}

export const getToken = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const remainingAttempts: string = variableValidator(req.rateLimit)
			? Number(req.rateLimit.remaining).toString()
			: "unknown remaining attempts";
		if (Config.secret === "null") {
			next(new AppError("Server not configured", 500));
			return;
		}

		if (!variableValidator(req.body))
			return res.status(400).json({
				message: "Missing body",
				remainingAttempts: remainingAttempts,
			});

		const { email, password } = req.body;

		if (!arrayValidator([email, password]))
			return res.status(400).json({
				message: "Missing email or password",
				remainingAttempts: remainingAttempts,
			});
		else if (!emailValidator(email)) {
			return res.status(400).json({
				message: "Invalid email",
				remainingAttempts: remainingAttempts,
			});
		}

		const queryResult = await queryWithoutExecutioner(
			"SELECT * FROM users WHERE email = ?",
			[email],
		);
		if (!queryResult || queryResult.rows.length === 0) {
			return res.status(401).json({
				message: "Unauthorized",
				remainingAttempts: remainingAttempts,
			});
		}
		const user = queryResult.rows[0];

		const passwordMatch = await Bun.password.verify(
			password as string,
			user.password_hash,
			"bcrypt",
		);

		if (!passwordMatch) {
			return res.status(401).json({
				message: "Unauthorized",
				remainingAttempts: remainingAttempts,
			});
		}

		const payload: User = {
			id: user.id,
			username: user.username,
			email: user.email,
		};

		const accessToken = jwt.sign(payload, Config.secret, {
			expiresIn: ACCESS_TOKEN_TTL,
		});

		const refreshToken = await generateRefreshToken(user.id);

		return res.status(200).json({ accessToken, refreshToken });
	} catch (err) {
		next(err);
	}
};

export const refreshToken = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (Config.secret === "null") {
			next(new AppError("Server not configured", 500));
			return;
		}

		const raw: string | undefined = req.body?.refreshToken;
		if (!raw) {
			return res.status(400).json({ message: "Missing refreshToken" });
		}

		const hash = hashToken(raw);

		const result = await queryWithoutExecutioner(
			"SELECT rt.id, rt.expires_at, u.id as user_id, u.username, u.email FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = ?",
			[hash],
		);

		if (!result || result.rows.length === 0) {
			return res.status(401).json({ message: "Invalid or expired refresh token" });
		}

		const row = result.rows[0];

		if (new Date(row.expires_at) < new Date()) {
			await queryWithoutExecutioner("DELETE FROM refresh_tokens WHERE id = ?", [row.id]);
			return res.status(401).json({ message: "Refresh token expired" });
		}

		// Rotate: delete old token and issue a new one
		await queryWithoutExecutioner("DELETE FROM refresh_tokens WHERE id = ?", [row.id]);

		const payload: User = {
			id: row.user_id,
			username: row.username,
			email: row.email,
		};

		const accessToken = jwt.sign(payload, Config.secret, {
			expiresIn: ACCESS_TOKEN_TTL,
		});

		const newRefreshToken = await generateRefreshToken(row.user_id);

		return res.status(200).json({ accessToken, refreshToken: newRefreshToken });
	} catch (err) {
		next(err);
	}
};

export const logout = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const raw: string | undefined = req.body?.refreshToken;
		if (!raw) {
			return res.status(400).json({ message: "Missing refreshToken" });
		}

		const hash = hashToken(raw);
		await queryWithoutExecutioner("DELETE FROM refresh_tokens WHERE token_hash = ?", [hash]);

		return res.status(204).send();
	} catch (err) {
		next(err);
	}
};
