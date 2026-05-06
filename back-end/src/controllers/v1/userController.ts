import { password } from "bun";
import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { Global } from "../../models/permissions.js";
import type { StrNum } from "../../models/strnum.js";
import database from "../../services/databaseService.js";
import { setETag } from "../../services/eTagService.js";
import { hasGlobalPermission } from "../../services/permissionService.js";
import {
	ifMatchValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { validateResult } from "../../validators/resultValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

async function isUserOrAdmin(userId: number, requestedUser: number) {
	if (
		!(await hasGlobalPermission(userId, Global.ADMIN_USER)) &&
		userId !== requestedUser
	) {
		throw new AppError("Forbidden", 403);
	}
}

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

		let sql = `
		  SELECT u.id, u.username, u.email, u.created_at
		  FROM users u
	  `;
		const pagination = req.pagination || {};
		const params: StrNum[] = [];
		sql += ` ORDER BY u.id ASC`;
		if (typeof pagination.limit === "number") {
			sql += ` LIMIT ?`;
			params.push(pagination.limit);
		}
		if (typeof pagination.offset === "number") {
			sql += ` OFFSET ?`;
			params.push(pagination.offset);
		}
		const result = await database.query(sql, params, userId);

		validateResult(result);

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

		validateResult(result);

		await setETag(req, "users", result.rows[0].id, res);

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
			? await password.hash(req.body.password as string, {
					algorithm: "bcrypt",
				})
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

		return res.status(201).json({ message: "User created successfully" });
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
			const newHash = await password.hash(req.body.password as string, {
				algorithm: "bcrypt",
			});
			params.push(newHash);
		}
		if (!req.body.username && !req.body.email && !req.body.password)
			return res.status(400).json({ message: "Nothing to update" });
		sql = `${sql.slice(0, -1)} WHERE id = ?`;
		params.push(requestedUser);
		await database.query(sql, params, userId);

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
			? await password.hash(req.body.password as string, {
					algorithm: "bcrypt",
				})
			: null;
		if (username === null || email === null || password_hash === null)
			return res.status(400).json({ message: "Missing required fields" });

		await ifMatchValidator(req, "users", requestedUser);

		await database.query(
			sql,
			[username, email, password_hash, requestedUser],
			userId,
		);

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
		await database.query(sql, [requestedUser], userId);

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

		let sql = `
		  SELECT up.id, up.user_id, up.permission
		  FROM user_permissions up
		  WHERE up.user_id = ?
	  `;
		const pagination = req.pagination || {};
		const params: StrNum[] = [requestedUser];
		sql += ` ORDER BY u.id ASC`;
		if (typeof pagination.limit === "number") {
			sql += ` LIMIT ?`;
			params.push(pagination.limit);
		}
		if (typeof pagination.offset === "number") {
			sql += ` OFFSET ?`;
			params.push(pagination.offset);
		}
		const result = await database.query(sql, params, userId);
		validateResult(result);
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
		const permission = variableValidator(req.params.permission)
			? req.params.permission
			: null;

		if (!userId) return res.status(401).json({ message: "Unauthorized" });
		if (!(await hasGlobalPermission(userId, Global.ADMIN_USER))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		if (permission === null || Array.isArray(permission))
			return res.status(400).json({ message: "Missing or invalid permission" });

		const sql = `DELETE FROM user_permissions WHERE user_id = ? AND permission = ?`;
		await database.query(sql, [requestedUser, permission], userId);

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
		const permission = variableValidator(req.body.permission)
			? req.body.permission
			: null;

		if (!userId) return res.status(401).json({ message: "Unauthorized" });
		if (!(await hasGlobalPermission(userId, Global.ADMIN_USER))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		if (permission === null || Array.isArray(permission))
			return res.status(400).json({ message: "Missing or invalid permission" });

		const sql = `INSERT INTO user_permissions (user_id, permission) VALUES (?, ?)`;
		await database.query(sql, [requestedUser, permission], userId);
		return res.status(201).json({
			message: "User permission created successfully",
		});
	} catch (err) {
		next(err);
	}
};
