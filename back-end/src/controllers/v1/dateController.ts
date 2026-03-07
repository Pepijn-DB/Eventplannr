import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { Event } from "../../models/permissions.js";
import database from "../../services/databaseService.js";
import { hasEventPermission } from "../../services/permissionService.js";
import {
	eventValidator,
	ifMatchValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

function getRequestVariables(req: AuthRequest, needsId: boolean) {
	const userId = userValidator(req);
	const eventId = eventValidator(req);
	const dateId = variableValidator(req.params.date_id)
		? Number(req.params.date_id)
		: -1;

	if ((dateId === -1 && needsId) || Number.isNaN(dateId) || dateId < 0) {
		throw new AppError("Missing or invalid date id", 400);
	}

	return { userId, eventId, dateId };
}

export const getEventDates = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId } = getRequestVariables(req, false);

		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const sql = `SELECT ed.id, ed.date FROM event_dates ed WHERE ed.event_id = ? ORDER BY ed.date ASC`;
		const result = await database.query(sql, [eventId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const createEventDate = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId } = getRequestVariables(req, false);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_DATE))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const date = variableValidator(req.body.date)
			? new Date(req.body.date)
			: null;
		if (date === null || Number.isNaN(date.getTime())) {
			return res.status(400).json({ message: "Invalid date" });
		}

		const sql = `INSERT INTO event_dates (event_id, date) VALUES (?, ?)`;
		const result = await database.query(sql, [eventId, req.body.date], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(201).json({ message: "Date created" });
	} catch (err) {
		next(err);
	}
};

export const deleteEventDate = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId, dateId } = getRequestVariables(req, true);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_DATE))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const sql = `DELETE FROM event_dates WHERE id = ?`;
		const result = await database.query(sql, [dateId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json({ message: "Date deleted" });
	} catch (err) {
		next(err);
	}
};

export const updateEventDate = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId } = getRequestVariables(req, true);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_DATE))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		return res.status(405).json({ message: "Method not implemented." });
	} catch (err) {
		next(err);
	}
};

export const updateFullEventDate = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId, dateId } = getRequestVariables(req, true);

		if (!(await hasEventPermission(userId, eventId, Event.EDIT_DATE))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		await ifMatchValidator(req, `SELECT * FROM event_dates WHERE id = ?`, [
			dateId,
		]);

		return res.status(405).json({ message: "Method not implemented." });
	} catch (err) {
		next(err);
	}
};

export const getEventDate = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId, dateId } = getRequestVariables(req, true);

		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const sql = `SELECT ed.id, ed.date FROM event_dates ed WHERE ed.id = ?`;
		const result = await database.query(sql, [dateId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};
