import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import type { StrNum } from "../../models/strnum.js";
import databaseService from "../../services/databaseService.js";
import database from "../../services/databaseService.js";
import {
	eventValidator,
	invitationValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

async function hasEventViewPermission(
	eventId: number,
	userId: number,
): Promise<boolean> {
	const sqlInvitations = `
       SELECT i.user_id, i.event_id, i.role
       FROM invitation i
       WHERE i.id = ? AND i.user_id = ?
     `;

	const resultInvitation = await databaseService.query(
		sqlInvitations,
		[eventId],
		userId,
	);

	return (
		resultInvitation.rows.length > 0 || hasEventEditPermission(eventId, userId)
	);
}

async function hasEventEditPermission(
	eventId: number,
	userId: number,
): Promise<boolean> {
	const sqlInvitations = `
       SELECT i.user_id, i.event_id, i.role
       FROM invitation i
       WHERE i.event_id = ? AND i.user_id = ? AND i.role = 'ORGANIZER'
     `;

	const sqlEvent = `
        SELECT e.id, e.title, e.description, e.creator_user, e.status
        FROM events e
        WHERE e.id = ? AND e.creator_user = ?
    `;

	const sqlAdmin = `
			SELECT up.user_id, up.permission
			FROM user_permission up
			WHERE up.user_id = ? AND (up.permission = 'GLOBAL_ADMIN' or up.permission = 'EVENT_ADMIN')
			LIMIT 1
	`;
	const resultAdmin = await database.query(sqlAdmin, [userId], userId);

	const resultInvitation = await databaseService.query(
		sqlInvitations,
		[eventId],
		userId,
	);
	const resultEvent = await databaseService.query(sqlEvent, [eventId], userId);

	return (
		resultInvitation.rows.length > 0 ||
		resultEvent.rows.length > 0 ||
		resultAdmin.rows.length > 0
	);
}

export const getInvitations = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);

		if (!(await hasEventViewPermission(eventId, userId))) {
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
		if (!(await hasEventEditPermission(resultEvent.rows[0].id, userId))) {
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

		if (!(await hasEventEditPermission(eventId, userId))) {
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

		if (!(await hasEventEditPermission(eventId, userId))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		let sql = `UPDATE invitation SET`;
		const params: StrNum[] = [];

		if (req.body.role) {
			sql += ` title = ?,`;
			params.push(req.body.title);
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

export const getInvitation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);

		if (!(await hasEventViewPermission(eventId, userId))) {
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
