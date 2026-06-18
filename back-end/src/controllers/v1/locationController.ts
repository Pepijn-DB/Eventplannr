import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { AppError } from "../../middlewares/errorHandler.js";
import { Event, Location } from "../../models/permissions.js";
import type { StrNum } from "../../models/strnum.js";
import database from "../../services/databaseService.js";
import { setETag } from "../../services/eTagService.js";
import {
	needsEventPermission,
	needsLocationPermission,
} from "../../services/permissionService.js";
import {
	ifMatchValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { validateResult } from "../../validators/resultValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

function getRequestVariables(req: AuthRequest, needsId: boolean) {
	try {
		const userId = userValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: -1;

		if (
			(locationId === -1 && needsId) ||
			Number.isNaN(locationId) ||
			(locationId < 0 && needsId)
		) {
			throw new AppError("Missing or invalid location id", 400);
		}

		return { userId, locationId };
	} catch (err) {
		if (err instanceof AppError) {
			throw err;
		}
		throw new AppError("Internal server error", 500);
	}
}

export const getLocations = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId } = getRequestVariables(req, false);
		let sql = `SELECT l.id, l.name
					 FROM locations l
					 WHERE l.creator_user = ?`;
		const pagination = req.pagination || {};
		const params: StrNum[] = [userId];
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

export const getLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, locationId } = getRequestVariables(req, true);

		await needsLocationPermission(userId, locationId, Location.VIEW);

		const sql = `SELECT l.id, l.name
					 FROM locations l
					 WHERE l.creator_user = ? AND l.id = ?`;
		const result = await database.query(sql, [userId, locationId], userId);
		validateResult(result);
		await setETag(req, "location", result.rows[0].id, res);

		return res.status(200).json({ result: result.rows });
	} catch (err) {
		next(err);
	}
};

export const deleteLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, locationId } = getRequestVariables(req, true);

		await needsLocationPermission(userId, locationId, Location.EDIT_ALL);

		await database.transaction(userId, async (txQuery) => {
			await txQuery(
				`DELETE FROM location_response WHERE location_id IN (SELECT id FROM event_locations WHERE location_id = ?)`,
				[locationId],
			);
			await txQuery(`DELETE FROM event_locations WHERE location_id = ?`, [
				locationId,
			]);
			await txQuery(`DELETE FROM locations WHERE id = ?`, [locationId]);
		});

		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const createLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId } = getRequestVariables(req, false);
		const locationName = variableValidator(req.body.name)
			? req.body.name
			: null;
		if (!locationName)
			return res.status(400).json({ message: "Missing location name" });
		const sql = `INSERT INTO locations (creator_user, name) VALUES (?, ?)`;
		await database.query(sql, [userId, locationName], userId);

		return res.status(201).json({
			message: "Location created successfully",
		});
	} catch (err) {
		next(err);
	}
};

export const updateLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, locationId } = getRequestVariables(req, true);

		await needsLocationPermission(userId, locationId, Location.EDIT_ALL);

		const sql = `UPDATE locations SET name = ? WHERE id = ?`;
		const locationName = variableValidator(req.body.name)
			? req.body.name
			: null;
		if (!locationName)
			return res.status(400).json({ message: "Missing location name" });
		await database.query(sql, [locationName, locationId], userId);

		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const updateFullLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, locationId } = getRequestVariables(req, true);

		await needsLocationPermission(userId, locationId, Location.EDIT_ALL);

		const sql = `UPDATE locations SET name = ? WHERE id = ?`;
		const locationName = variableValidator(req.body.name)
			? req.body.name
			: null;
		if (!locationName)
			return res.status(400).json({ message: "Missing location name" });

		await ifMatchValidator(req, `location`, locationId);
		await database.query(sql, [locationName, locationId], userId);

		return res.status(204).json();
	} catch (err) {
		next(err);
	}
};

export const getEventLocations = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId } = getRequestVariables(req, false);
		const eventId = variableValidator(req.params.event_id)
			? Number(req.params.event_id)
			: null;
		if (eventId === null || Number.isNaN(eventId) || eventId < 0) {
			return res.status(400).json({ message: "Missing or invalid event id" });
		}
		await needsEventPermission(userId, eventId, Event.VIEW);

		let sql = `SELECT el.id, l.id as location_id, l.name
					 FROM event_locations el
					 JOIN locations l ON el.location_id = l.id
					 WHERE el.event_id = ?`;
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

export const getEventLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, locationId } = getRequestVariables(req, true);
		const eventId = variableValidator(req.params.event_id)
			? Number(req.params.event_id)
			: null;
		if (eventId === null || Number.isNaN(eventId) || eventId < 0) {
			return res.status(400).json({ message: "Missing or invalid event id" });
		}
		await needsEventPermission(userId, eventId, Event.VIEW);

		const sql = `SELECT l.id, l.name
					 FROM event_locations el
					 JOIN locations l ON el.location_id = l.id
					 WHERE el.event_id = ? AND el.location_id = ?`;
		const result = await database.query(sql, [eventId, locationId], userId);
		validateResult(result);
		await setETag(req, "event_locations", result.rows[0].id, res);
		return res.status(200).json({ result: result.rows });
	} catch (err) {
		next(err);
	}
};

export const createEventLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId } = getRequestVariables(req, false);
		const eventId = variableValidator(req.params.event_id)
			? Number(req.params.event_id)
			: null;
		const locationId = variableValidator(req.body.location_id)
			? Number(req.body.location_id)
			: null;
		if (eventId === null || Number.isNaN(eventId) || eventId < 0) {
			return res.status(400).json({ message: "Missing or invalid event id" });
		} else if (
			locationId === null ||
			Number.isNaN(locationId) ||
			locationId < 0
		) {
			return res
				.status(400)
				.json({ message: "Missing or invalid location id" });
		}
		await needsEventPermission(userId, eventId, Event.EDIT_LOCATION);

		const sql = `INSERT INTO event_locations (event_id, location_id) VALUES (?, ?)`;
		await database.query(sql, [eventId, locationId], userId);
		return res.status(201).json({
			message: "Event location created successfully",
		});
	} catch (err) {
		next(err);
	}
};

export const deleteEventLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		try {
			const { userId, locationId } = getRequestVariables(req, true);
			const eventId = variableValidator(req.params.event_id)
				? Number(req.params.event_id)
				: null;
			if (eventId === null || Number.isNaN(eventId) || eventId < 0) {
				return res.status(400).json({ message: "Missing or invalid event id" });
			}

			await needsEventPermission(userId, eventId, Event.EDIT_LOCATION);

			const eventLocation = await database.query(
				`SELECT id FROM event_locations WHERE event_id = ? AND location_id = ?`,
				[eventId, locationId],
				userId,
			);

			if (!eventLocation || eventLocation.rows.length === 0) {
				return res.status(404).json({ message: "Event location not found" });
			}

			const eventLocationId = eventLocation.rows[0].id;

			await database.transaction(userId, async (txQuery) => {
				await txQuery(`DELETE FROM location_response WHERE location_id = ?`, [
					eventLocationId,
				]);
				await txQuery(
					`DELETE FROM event_locations WHERE event_id = ? AND location_id = ?`,
					[eventId, locationId],
				);
			});

			return res.status(204).json();
		} catch (err) {
			next(err);
		}
	} catch (err) {
		next(err);
	}
};

export const updateEventLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		try {
			const { userId } = getRequestVariables(req, true);
			const eventId = variableValidator(req.params.event_id)
				? Number(req.params.event_id)
				: null;
			if (eventId === null || Number.isNaN(eventId) || eventId < 0) {
				return res.status(400).json({ message: "Missing or invalid event id" });
			}
			await needsEventPermission(userId, eventId, Event.EDIT_LOCATION);

			return res.status(405).json({ message: "Method not implemented." });
		} catch (err) {
			next(err);
		}
	} catch (err) {
		next(err);
	}
};

export const updateFullEventLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const { userId, locationId } = getRequestVariables(req, true);
		const eventId = variableValidator(req.params.event_id)
			? Number(req.params.event_id)
			: null;
		if (eventId === null || Number.isNaN(eventId) || eventId < 0) {
			return res.status(400).json({ message: "Missing or invalid event id" });
		}

		await needsEventPermission(userId, eventId, Event.EDIT_LOCATION);

		const idResult = await database.query(
			`SELECT id FROM event_locations WHERE event_id = ? AND location_id = ?`,
			[eventId, locationId],
			userId,
		);

		if (!idResult) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (idResult.rows.length === 0) {
			return res.status(404).json({ message: "Event location not found" });
		}

		await ifMatchValidator(req, "event_locations", idResult.rows[0].id);
		return res.status(405).json({ message: "Method not implemented." });
	} catch (err) {
		next(err);
	}
};
