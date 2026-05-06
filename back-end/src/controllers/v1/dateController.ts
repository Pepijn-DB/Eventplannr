import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { Event } from "../../models/permissions.js";
import type { StrNum } from "../../models/strnum.js";
import database from "../../services/databaseService.js";
import { setETag } from "../../services/eTagService.js";
import { needsEventPermission } from "../../services/permissionService.js";
import {
	eventValidator,
	ifMatchValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { validateResult } from "../../validators/resultValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

function getRequestVariables(req: AuthRequest, needsId: boolean) {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const dateId = variableValidator(req.params.date_id)
			? Number(req.params.date_id)
			: -1;

		if (
			(dateId === -1 && needsId) ||
			Number.isNaN(dateId) ||
			(dateId < 0 && needsId)
		) {
			throw new AppError("Missing or invalid date id", 400);
		}

		return { userId, eventId, dateId };
	} catch (err) {
		if (err instanceof AppError) {
			throw err;
		}
		throw new AppError("Internal server error", 500);
	}
}

export const getEventDates = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId } = getRequestVariables(req, false);

		await needsEventPermission(userId, eventId, Event.VIEW);

		let sql = `SELECT ed.id, ed.date FROM event_dates ed WHERE ed.event_id = ?`;
		const pagination = req.pagination || {};
		const params: StrNum[] = [eventId];
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

export const createEventDate = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, eventId } = getRequestVariables(req, false);

		await needsEventPermission(userId, eventId, Event.EDIT_DATE);

		const date = variableValidator(req.body.date)
			? new Date(req.body.date)
			: null;
		if (date === null || Number.isNaN(date.getTime())) {
			return res.status(400).json({ message: "Invalid date" });
		}

		const sql = `INSERT INTO event_dates (event_id, date) VALUES (?, ?)`;
		await database.query(sql, [eventId, req.body.date], userId);

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

		await needsEventPermission(userId, eventId, Event.EDIT_DATE);

		await database.query(
			`DELETE FROM date_response WHERE date_id = ?`,
			[dateId],
			userId,
		);

		const sql = `DELETE FROM event_dates WHERE id = ?`;
		await database.query(sql, [dateId], userId);

		return res.status(204).json();
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

		await needsEventPermission(userId, eventId, Event.EDIT_DATE);

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

		await needsEventPermission(userId, eventId, Event.EDIT_DATE);

		await ifMatchValidator(req, `event_dates`, dateId);

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

		await needsEventPermission(userId, eventId, Event.VIEW);

		const sql = `SELECT ed.id, ed.date FROM event_dates ed WHERE ed.id = ?`;
		const result = await database.query(sql, [dateId], userId);

		validateResult(result);

		await setETag(req, "event_dates", result.rows[0].id, res);

		return res.status(200).json({ result: result.rows });
	} catch (err) {
		next(err);
	}
};
