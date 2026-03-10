import bcrypt from "bcrypt";
import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { Global } from "../../models/permissions.js";
import type { StrNum } from "../../models/strnum.js";
import database from "../../services/databaseService.js";
import { hasGlobalPermission } from "../../services/permissionService.js";
import {
	ifMatchValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

const SALT_ROUNDS = 10;

function getRequestVariables(req: AuthRequest, needsReqUser: boolean) {
	try {
		const userId = userValidator(req);
		const requestedUser = variableValidator(req.params.id)
			? Number(req.params.id)
			: -1;

		if (
			(requestedUser === -1 && needsReqUser) ||
			Number.isNaN(requestedUser) ||
			(needsReqUser && requestedUser < 0)
		) {
			throw new AppError("Missing or invalid user id", 400);
		}

		return {
			userId,
			requestedUser,
		};
	} catch (err) {
		if (err instanceof AppError) {
			throw err;
		}
		throw new AppError("Internal server error", 500);
	}
}

export const getUsers = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId } = getRequestVariables(req, false);

		if (!(await hasGlobalPermission(userId, Global.ADMIN_USER))) {
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
		return res.status(200).json({ result: result.rows });
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
		const { userId, requestedUser } = getRequestVariables(req, true);

		if (
			!(await hasGlobalPermission(userId, Global.ADMIN_USER)) &&
			userId !== requestedUser
		) {
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
		return res.status(200).json({ result: result.rows });
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

		await database.queryWithoutExecutioner(sql, [
			username,
			password_hash,
			email,
		]);

		return res
			.status(201)
			.json({ message: "User created successfully" });
	} catch (err) {
		next(err);
	}
};

export const updateUser = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, requestedUser } = getRequestVariables(req, true);

		let sql = `UPDATE users SET`;
		const params: StrNum[] = [];

		if (
			!(await hasGlobalPermission(userId, Global.ADMIN_USER)) &&
			userId !== requestedUser
		) {
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
			const newHash = await bcrypt.hash(
				req.body.password as string,
				SALT_ROUNDS,
			);
			params.push(newHash);
		}
		if (!req.body.username && !req.body.email && !req.body.password)
			return res.status(400).json({ message: "Nothing to update" });
		sql = `${sql.slice(0, -1)} WHERE id = ?`;
		params.push(requestedUser);
		const result = await database.query(sql, params, userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const updateFullUser = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, requestedUser } = getRequestVariables(req, true);

		if (
			!(await hasGlobalPermission(userId, Global.ADMIN_USER)) &&
			userId !== requestedUser
		) {
			return res.status(403).json({ message: "Forbidden" });
		}

		if (!req.body.username || !req.body.email || !req.body.password)
			return res.status(400).json({ message: "Request is not complete" });

		const sql = `UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?`;
		const username = variableValidator(req.body.username)
			? (req.body.username as string)
			: null;
		const email = variableValidator(req.body.email)
			? (req.body.email as string)
			: null;
		const password_hash = variableValidator(req.body.password)
			? await bcrypt.hash(req.body.password as string, SALT_ROUNDS)
			: null;
		if (username === null || email === null || password_hash === null)
			return res.status(400).json({ message: "Missing required fields" });

		await ifMatchValidator(req, `SELECT * FROM users WHERE id = ?`, [
			requestedUser,
		]);

		const result = await database.query(
			sql,
			[username, email, password_hash, requestedUser],
			userId,
		);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const deleteUser = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, requestedUser } = getRequestVariables(req, true);

		if (
			!(await hasGlobalPermission(userId, Global.ADMIN_USER)) &&
			userId !== requestedUser
		) {
			return res.status(403).json({ message: "Forbidden" });
		}

		await database.query(
			`DELETE FROM user_permissions WHERE user_id = ?`,
			[requestedUser],
			userId,
		);

		const sql = `DELETE FROM users WHERE id = ?`;
		const result = await database.query(sql, [requestedUser], userId);

		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}

		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const getUserPermissions = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, requestedUser } = getRequestVariables(req, true);

		if (!userId) return res.status(401).json({ message: "Unauthorized" });
		if (!(await hasGlobalPermission(userId, Global.ADMIN_USER))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const sql = `
		SELECT up.user_id, up.permission
		FROM user_permissions up
		WHERE up.user_id = ?
	`;
		const result = await database.query(sql, [requestedUser], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json({ result: result.rows });
	} catch (err) {
		next(err);
	}
};

export const updateUserPermission = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId } = getRequestVariables(req, false);

		if (!userId) return res.status(401).json({ message: "Unauthorized" });
		if (!(await hasGlobalPermission(userId, Global.ADMIN_USER))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		return res.status(405).json({ message: "Method not implemented." });
	} catch (err) {
		next(err);
	}
};

export const updateFullUserPermission = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId } = getRequestVariables(req, false);

		if (!userId) return res.status(401).json({ message: "Unauthorized" });
		if (!(await hasGlobalPermission(userId, Global.ADMIN_USER))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		return res.status(405).json({ message: "Method not implemented." });
	} catch (err) {
		next(err);
	}
};

export const deleteUserPermission = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, requestedUser } = getRequestVariables(req, true);
		const permissionId = variableValidator(req.params.permission_id)
			? Number(req.params.permission_id)
			: null;

		if (!userId) return res.status(401).json({ message: "Unauthorized" });
		if (!(await hasGlobalPermission(userId, Global.ADMIN_USER))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		if (permissionId === null || Number.isNaN(permissionId) || permissionId < 0)
			return res
				.status(400)
				.json({ message: "Missing or invalid permissionId" });

		const sql = `DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?`;
		const result = await database.query(
			sql,
			[requestedUser, permissionId],
			userId,
		);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const createUserPermission = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, requestedUser } = getRequestVariables(req, true);
		const permissionId = variableValidator(req.body.permission_id)
			? Number(req.body.permission_id)
			: null;

		if (!userId) return res.status(401).json({ message: "Unauthorized" });
		if (!(await hasGlobalPermission(userId, Global.ADMIN_USER))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		if (permissionId === null || Number.isNaN(permissionId) || permissionId < 0)
			return res
				.status(400)
				.json({ message: "Missing or invalid permissionId" });

		const sql = `INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)`;
		await database.query(
			sql,
			[requestedUser, permissionId],
			userId,
		);
		return res.status(201).json({
			message: "User permission created successfully",
		});
	} catch (err) {
		next(err);
	}
};
