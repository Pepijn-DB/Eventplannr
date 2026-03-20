import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { Event } from "../../models/permissions.js";
import type { StrNum } from "../../models/strnum.js";
import database from "../../services/databaseService.js";
import { setETag } from "../../services/eTagService.js";
import { hasEventPermission } from "../../services/permissionService.js";
import {
	ifMatchValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

function getRequestVariables(req: AuthRequest, needsId: boolean) {
	try {
		const userId = userValidator(req);
		const eventId = variableValidator(req.params.event_id)
			? Number(req.params.event_id)
			: -1;

		if (
			(eventId === -1 && needsId) ||
			Number.isNaN(eventId) ||
			(eventId < 0 && needsId)
		) {
			throw new AppError("Missing or invalid event_id", 400);
		}

		return {
			userId,
			eventId,
		};
	} catch (err) {
		if (err instanceof AppError) {
			throw err;
		}
		throw new AppError("Internal server error", 500);
	}
}

export const getEvents = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId } = getRequestVariables(req, false);

		const sql = `
            SELECT e.id, e.title, e.description, e.creator_user, e.status
            FROM events e
            INNER JOIN invitation i ON i.event_id = e.id
            WHERE i.user_id = ? OR e.creator_user = ?
            ORDER BY e.created_at DESC
        `;

		const result = await database.query(sql, [userId, userId], userId);

		return res.status(200).json({ result: result.rows });
	} catch (err) {
		next(err);
	}
};

export const getEvent = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId } = getRequestVariables(req, true);

		const sql = `
            SELECT e.id, e.title, e.description, e.creator_user, e.status
            FROM events e
            INNER JOIN invitation i ON i.event_id = e.id
            WHERE i.user_id = ? AND e.id = ?
        `;

		const result = await database.query(sql, [userId, eventId], userId);

		if (result.rows.length === 0) {
			return res.status(400).json({ message: "Event not found" });
		}

		await setETag(req, "events", result.rows[0].id, res);

		return res.status(200).json({ result: result.rows });
	} catch (err) {
		next(err);
	}
};

export const createEvent = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	const { title, description } = req.body;
	if (!title) return res.status(400).json({ message: "Missing title" });
	try {
		const { userId } = getRequestVariables(req, false);

		const sql = `
            INSERT INTO events (creator_user, title, description, status)
            VALUES (?, ?, ?, OPEN)
        `;

		await database.query(sql, [userId, title, description], userId);

		return res.status(201).json({ message: "Event created" });
	} catch (err) {
		next(err);
	}
};

export const updateEvent = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	let sql = `UPDATE events SET`;
	const params: StrNum[] = [];

	try {
		const { userId, eventId } = getRequestVariables(req, true);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_ALL))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		if (req.body.title) {
			sql += ` title = ?,`;
			params.push(req.body.title);
		}
		if (req.body.description) {
			sql += ` description = ?,`;
			params.push(req.body.description);
		}
		if (req.body.status) {
			sql += ` status = ?,`;
			if (
				req.body.status !== "CLOSED" &&
				req.body.status !== "OPEN" &&
				req.body.status !== "CANCELLED" &&
				req.body.status !== "DRAFT"
			) {
				return res.status(400).json({ message: "Invalid status" });
			}
			params.push(req.body.status);
		}
		if (!req.body.title && !req.body.description && !req.body.status)
			return res.status(400).json({ message: "Nothing to update" });

		sql = `${sql.slice(0, -1)} WHERE id = ?`;
		params.push(eventId);

		await database.query(sql, params, userId);

		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const updateFullEvent = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId } = getRequestVariables(req, true);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_ALL))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		if (!req.body.title || !req.body.description || !req.body.status) {
			return res.status(400).json({ message: "Request is not complete" });
		}

		const sql = `UPDATE events SET title = ?, description = ?, status = ? WHERE id = ?`;
		if (
			req.body.status !== "CLOSED" &&
			req.body.status !== "OPEN" &&
			req.body.status !== "CANCELLED" &&
			req.body.status !== "DRAFT"
		) {
			return res.status(400).json({ message: "Invalid status" });
		}

		await ifMatchValidator(req, `events`, eventId);

		await database.query(
			sql,
			[req.body.title, req.body.description, req.body.status, eventId],
			userId,
		);

		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const deleteEvent = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId } = getRequestVariables(req, true);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_ALL))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		await database.query(
			`DELETE FROM date_response WHERE date_id IN (SELECT id FROM event_dates WHERE event_id = ?)`,
			[eventId],
			userId,
		);
		await database.query(
			`DELETE FROM location_response WHERE location_id IN (SELECT id FROM event_locations WHERE event_id = ?)`,
			[eventId],
			userId,
		);
		await database.query(
			`DELETE FROM event_dates WHERE event_id = ?`,
			[eventId],
			userId,
		);
		await database.query(
			`DELETE FROM event_locations WHERE event_id = ?`,
			[eventId],
			userId,
		);
		await database.query(
			`DELETE FROM invitation WHERE event_id = ?`,
			[eventId],
			userId,
		);

		const sqlDelete = `DELETE FROM events WHERE id = ?`;
		await database.query(sqlDelete, [eventId], userId);

		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};
