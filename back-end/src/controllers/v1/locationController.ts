import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { Event, Location } from "../../models/permissions.js";
import database from "../../services/databaseService.js";
import {
	hasEventPermission,
	hasLocationPermission,
} from "../../services/permissionService.js";
import { userValidator } from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

export const getLocations = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const sql = `SELECT l.id, l.name
					 FROM locations l
					 WHERE l.creator_user = ?`;
		const result = await database.query(sql, [userId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
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
		const userId = userValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (!locationId)
			return res.status(400).json({ message: "Missing location id" });
		if (!(await hasLocationPermission(userId, locationId, Location.VIEW)))
			return res.status(403).json({ message: "Forbidden" });
		const sql = `SELECT l.id, l.name
					 FROM locations l
					 WHERE l.creator_user = ? AND l.id = ?`;
		const result = await database.query(sql, [userId, locationId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
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
		const userId = userValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (!locationId)
			return res.status(400).json({ message: "Missing location id" });
		if (!(await hasLocationPermission(userId, locationId, Location.EDIT_ALL)))
			return res.status(403).json({ message: "Forbidden" });
		const sql = `DELETE FROM locations WHERE id = ?`;
		await database.query(sql, [locationId], userId);
		return res.status(200).json({ message: "Location deleted successfully" });
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
		const userId = userValidator(req);
		const locationName = variableValidator(req.body.name)
			? req.body.name
			: null;
		if (!locationName)
			return res.status(400).json({ message: "Missing location name" });
		const sql = `INSERT INTO locations (creator_user, name) VALUES (?, ?)`;
		await database.query(sql, [userId, locationName], userId);
		return res.status(201).json({ message: "Location created successfully" });
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
		const userId = userValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (!locationId)
			return res.status(400).json({ message: "Missing location id" });
		if (!(await hasLocationPermission(userId, locationId, Location.EDIT_ALL)))
			return res.status(403).json({ message: "Forbidden" });
		const sql = `UPDATE locations SET name = ? WHERE id = ?`;
		const locationName = variableValidator(req.body.name)
			? req.body.name
			: null;
		if (!locationName)
			return res.status(400).json({ message: "Missing location name" });
		await database.query(sql, [locationName, locationId], userId);
		return res.status(200).json({ message: "Location updated successfully" });
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
		const userId = userValidator(req);
		const eventId = variableValidator(req.params.event_id)
			? Number(req.params.event_id)
			: null;
		if (eventId === null) {
			return res.status(400).json({ message: "Missing event id" });
		}
		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `SELECT l.id, l.name
					 FROM event_locations el
					 JOIN locations l ON el.location_id = l.id
					 WHERE el.event_id = ?`;
		const result = await database.query(sql, [eventId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
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
		const userId = userValidator(req);
		const eventId = variableValidator(req.params.event_id)
			? Number(req.params.event_id)
			: null;
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (eventId === null || locationId === null) {
			return res.status(400).json({ message: "Missing event or location id" });
		}
		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `SELECT l.id, l.name
					 FROM event_locations el
					 JOIN locations l ON el.location_id = l.id
					 WHERE el.event_id = ? AND el.location_id = ?`;
		const result = await database.query(sql, [eventId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
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
		const userId = userValidator(req);
		const eventId = variableValidator(req.params.event_id)
			? Number(req.params.event_id)
			: null;
		const locationId = variableValidator(req.body.location_id)
			? Number(req.body.location_id)
			: null;
		if (eventId === null || locationId === null) {
			return res.status(400).json({ message: "Missing event or location id" });
		}
		if (!(await hasEventPermission(userId, eventId, Event.EDIT_LOCATION))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `INSERT INTO event_locations (event_id, location_id) VALUES (?, ?)`;
		await database.query(sql, [eventId, locationId], userId);
		return res
			.status(201)
			.json({ message: "Event location created successfully" });
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
			const userId = userValidator(req);
			const eventId = variableValidator(req.params.event_id)
				? Number(req.params.event_id)
				: null;
			const locationId = variableValidator(req.params.location_id)
				? Number(req.params.location_id)
				: null;
			if (eventId === null || locationId === null) {
				return res
					.status(400)
					.json({ message: "Missing event or location id" });
			}
			if (!(await hasEventPermission(userId, eventId, Event.EDIT_LOCATION))) {
				return res.status(403).json({ message: "Forbidden" });
			}
			const sql = `DELETE FROM event_locations WHERE event_id = ? AND location_id = ?`;
			await database.query(sql, [eventId, locationId], userId);
			return res
				.status(201)
				.json({ message: "Event location deleted successfully" });
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
			const userId = userValidator(req);
			const eventId = variableValidator(req.params.event_id)
				? Number(req.params.event_id)
				: null;
			const locationId = variableValidator(req.params.location_id)
				? Number(req.params.location_id)
				: null;
			if (eventId === null || locationId === null) {
				return res
					.status(400)
					.json({ message: "Missing event or location id" });
			}
			if (!(await hasEventPermission(userId, eventId, Event.EDIT_LOCATION))) {
				return res.status(403).json({ message: "Forbidden" });
			}
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
		try {
			const userId = userValidator(req);
			const eventId = variableValidator(req.params.event_id)
				? Number(req.params.event_id)
				: null;
			const locationId = variableValidator(req.params.location_id)
				? Number(req.params.location_id)
				: null;
			if (eventId === null || locationId === null) {
				return res
					.status(400)
					.json({ message: "Missing event or location id" });
			}
			if (!(await hasEventPermission(userId, eventId, Event.EDIT_LOCATION))) {
				return res.status(403).json({ message: "Forbidden" });
			}
			return res.status(405).json({ message: "Method not implemented." });
		} catch (err) {
			next(err);
		}
	} catch (err) {
		next(err);
	}
};
