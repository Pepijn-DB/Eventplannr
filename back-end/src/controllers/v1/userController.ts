import bcrypt from "bcrypt";
import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import type { StrNum } from "../../models/strnum.js";
import database from "../../services/databaseService.js";
import { userValidator } from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

const SALT_ROUNDS = 10;

async function hasUserEditPermission(userId: number): Promise<boolean> {
	const sqlAdmin = `
			SELECT up.user_id, up.permission
			FROM user_permission up
			WHERE up.user_id = ? AND (up.permission = 'GLOBAL_ADMIN' or up.permission = 'USER_ADMIN')
			LIMIT 1
	`;
	const resultAdmin = await database.query(sqlAdmin, [userId], userId);

	return resultAdmin.rows.length > 0;
}

export const getUsers = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);

		if (!(await hasUserEditPermission(userId))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const sql = `
		SELECT u.id, u.username, u.email, u.created_at
		FROM users u
	`;
		const result = await database.query(sql, [userId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const getUser = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const requestedUser = Number(variableValidator(req.params.id));
		const userId = userValidator(req);

		if (!(await hasUserEditPermission(userId))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const sql = `
		SELECT u.id, u.username, u.email, u.created_at
		FROM users u
		WHERE u.id = ?
	`;
		const result = await database.query(sql, [requestedUser], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const createUser = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const username = (
			variableValidator(req.body.username) ? req.body.username : null
		) as StrNum;
		const password_hash = variableValidator(req.body.password)
			? await bcrypt.hash(req.body.password as string, SALT_ROUNDS)
			: null;
		const email = (
			variableValidator(req.body.email) ? req.body.email : null
		) as string;

		const sql = `
			INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)
		`;

		if (username === null || password_hash === null || email === null)
			return res.status(400).json({ message: "Missing required fields" });

		const result = await database.queryWithoutExecutioner(sql, [
			username,
			password_hash,
			email,
		]);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const updateUser = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	const requestedUser = Number(variableValidator(req.params.id));
	const userId = userValidator(req);

	let sql = `UPDATE users SET`;
	const params: StrNum[] = [];

	try {
		if (!(await hasUserEditPermission(userId))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		if (req.body.username) {
			sql += ` username = ?,`;
			params.push(req.body.username);
		}
		if (req.body.email) {
			sql += ` email = ?,`;
			params.push(req.body.email);
		}
		if (req.body.password) {
			sql += ` password_hash = ?,`;
			const newHash = await bcrypt.hash(req.body.password as string, SALT_ROUNDS);
			params.push(newHash);
		}
		if (!req.body.username && !req.body.email && !req.body.password)
			return res.status(400).json({ message: "Nothing to update" });
		sql = `${sql.slice(0, -1)} WHERE id = ?`;
		params.push(requestedUser);
		await database.query(sql, params, userId);
		return res.status(200).json({ message: "User updated successfully" });
	} catch (err) {
		next(err);
	}
};

export const deleteUser = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	const requestedUser = Number(variableValidator(req.params.id));
	const userId = userValidator(req);

	try {
		if (!(await hasUserEditPermission(userId))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const sql = `DELETE FROM users WHERE id = ?`;
		await database.query(sql, [requestedUser], userId);

		return res.status(200).json({ message: "User deleted successfully" });
	} catch (err) {
		next(err);
	}
};
