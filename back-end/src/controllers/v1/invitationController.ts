import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { Event } from "../../models/permissions.js";
import type { StrNum } from "../../models/strnum.js";
import databaseService from "../../services/databaseService.js";
import database from "../../services/databaseService.js";
import { hasEventPermission } from "../../services/permissionService.js";
import {
	eventValidator,
	ifMatchValidator,
	invitationValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

export const getInvitations = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);

		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `
            SELECT i.user_id, i.event_id, i.role
            FROM invitation i
            WHERE i.event_id = ?
        `;
		const result = await databaseService.query(sql, [eventId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const getUserInvitations = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = Number(
			variableValidator(req.params.id) ? req.params.id : userValidator(req),
		);
		const sql = `
            SELECT i.user_id, i.event_id, i.role
            FROM invitation i
            WHERE i.user_id = ?
        `;
		const result = await databaseService.query(
			sql,
			[userId],
			userValidator(req),
		);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const deleteInvitation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const invitationId = invitationValidator(req);

		const sqlEvent = `SELECT e.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.invitation_id = ?`;
		const resultEvent = await databaseService.query(
			sqlEvent,
			[invitationId],
			userId,
		);
		if (
			!(await hasEventPermission(
				userId,
				resultEvent.rows[0].id,
				Event.EDIT_INVITATION,
			))
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `
            DELETE FROM invitation 
            WHERE invitation_id = ?
        `;
		const result = await databaseService.query(sql, [invitationId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const createInvitation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_INVITATION))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const invitedUserId = variableValidator(req.body.userId)
			? req.body.userId
			: null;
		const role = variableValidator(req.body.role) ? req.body.role : "GUEST";

		const sql = `
            INSERT INTO invitation (event_id, user_id, role)
            VALUES (?, ?, ?)
        `;
		const result = await databaseService.query(
			sql,
			[eventId, invitedUserId, role],
			userId,
		);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const updateInvitation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const invitationId = invitationValidator(req);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_INVITATION))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		let sql = `UPDATE invitation SET`;
		const params: StrNum[] = [];

		if (req.body.role) {
			sql += ` role = ?,`;
			params.push(req.body.role);
		}
		if (!req.body.role)
			return res.status(400).json({ message: "Nothing to update" });

		sql = `${sql.slice(0, -1)} WHERE id = ?`;
		params.push(invitationId);

		await database.query(sql, params, userId);
	} catch (err) {
		next(err);
	}
};

export const updateFullInvitation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const invitationId = invitationValidator(req);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_INVITATION))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		await ifMatchValidator(req, `SELECT * FROM invitation WHERE id = ?`, [
			invitationId,
		]);

		const sql = `UPDATE invitation SET role = ? WHERE id = ?`;

		if (!req.body.role) {
			return res.status(400).json({ message: "Nothing to update" });
		}

		await database.query(sql, [req.body.role, invitationId], userId);
	} catch (err) {
		next(err);
	}
};

export const getInvitation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);

		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `
        SELECT i.user_id, i.event_id, i.role
        FROM invitation i
        WHERE i.event_id = ? AND i.invitation_id = ?
    `;
		const result = await databaseService.query(sql, [eventId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};
