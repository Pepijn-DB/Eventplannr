import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { Event } from "../../models/permissions.js";
import database from "../../services/databaseService.js";
import { hasEventPermission } from "../../services/permissionService.js";
import {
	eventValidator,
	ifMatchValidator,
	userValidator,
} from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

export const createDateResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const dateId = variableValidator(req.params.date_id)
			? Number(req.params.date_id)
			: null;
		if (!eventId || !dateId) {
			return res.status(400).json({ message: "Missing event or date id" });
		}
		const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
		const resultInvitation = await database.query(
			sqlInvitation,
			[userId, eventId],
			userId,
		);
		if (
			!resultInvitation ||
			!resultInvitation.rows[0] ||
			!resultInvitation.rows[0].id
		) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (resultInvitation.rows.length === 0) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const invitationId = resultInvitation.rows[0].id;

		const state = variableValidator(req.body.state) ? req.body.state : null;
		if (!state) {
			return res.status(400).json({ message: "Missing or invalid state" });
		}

		const sql = `INSERT INTO responses (invitation_id, date_id, state) VALUES (?, ?, ?)`;
		const result = await database.query(
			sql,
			[invitationId, dateId, state],
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

export const getDateResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const dateId = variableValidator(req.params.date_id)
			? Number(req.params.date_id)
			: null;
		if (!eventId || !dateId) {
			return res.status(400).json({ message: "Missing event or date id" });
		}
		if (await hasEventPermission(userId, eventId, Event.VIEW)) {
			const sql = `SELECT u.username, dr.state, ed.date FROM date_response dr INNER JOIN event_dates ed ON ed.id = dr.date_id INNER JOIN invitation i ON i.id = dr.invitation_id INNER JOIN users u ON i.user_id = u.id WHERE dr.date_id = ?`;
			const result = await database.query(sql, [dateId], userId);
			if (!result) {
				return res.status(500).json({ message: "Internal server error" });
			}
			return res.status(200).json(result.rows);
		} else {
			return res.status(403).json({ message: "Forbidden" });
		}
	} catch (err) {
		next(err);
	}
};

export const updateDateResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const dateId = variableValidator(req.params.date_id)
			? Number(req.params.date_id)
			: null;
		if (!eventId || !dateId) {
			return res.status(400).json({ message: "Missing event or date id" });
		}
		const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
		const resultInvitation = await database.query(
			sqlInvitation,
			[userId, eventId],
			userId,
		);
		if (
			!resultInvitation ||
			!resultInvitation.rows[0] ||
			!resultInvitation.rows[0].id
		) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (resultInvitation.rows.length === 0) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const invitationId = resultInvitation.rows[0].id;

		const state = variableValidator(req.body.state) ? req.body.state : null;
		if (!state) {
			return res.status(400).json({ message: "Missing or invalid state" });
		}

		const sql = `UPDATE date_response SET state = ? WHERE invitation_id = ? AND date_id = ?`;
		const result = await database.query(
			sql,
			[state, invitationId, dateId],
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

export const updateFullDateResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const dateId = variableValidator(req.params.date_id)
			? Number(req.params.date_id)
			: null;
		if (!eventId || !dateId) {
			return res.status(400).json({ message: "Missing event or date id" });
		}
		const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
		const resultInvitation = await database.query(
			sqlInvitation,
			[userId, eventId],
			userId,
		);
		if (
			!resultInvitation ||
			!resultInvitation.rows[0] ||
			!resultInvitation.rows[0].id
		) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (resultInvitation.rows.length === 0) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const invitationId = resultInvitation.rows[0].id;

		const state = variableValidator(req.body.state) ? req.body.state : null;
		if (!state) {
			return res.status(400).json({ message: "Missing or invalid state" });
		}

		const sql = `UPDATE date_response SET state = ? WHERE invitation_id = ? AND date_id = ?`;

		await ifMatchValidator(
			req,
			`SELECT * FROM date_response WHERE invitation_id = ? AND date_id = ?`,
			[invitationId, dateId],
		);

		const result = await database.query(
			sql,
			[state, invitationId, dateId],
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

export const deleteDateResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const dateId = variableValidator(req.params.date_id)
			? Number(req.params.date_id)
			: null;
		if (!eventId || !dateId) {
			return res.status(400).json({ message: "Missing event or date id" });
		}
		const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
		const resultInvitation = await database.query(
			sqlInvitation,
			[userId, eventId],
			userId,
		);
		if (
			!resultInvitation ||
			!resultInvitation.rows[0] ||
			!resultInvitation.rows[0].id
		) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (
			resultInvitation.rows.length === 0 ||
			!(await hasEventPermission(userId, eventId, Event.EDIT_INVITATION))
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const invitationId = resultInvitation.rows[0].id;

		const sql = `DELETE FROM date_response WHERE invitation_id = ? AND date_id = ?`;
		const result = await database.query(sql, [invitationId, dateId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const createLocationResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (!eventId || !locationId) {
			return res.status(400).json({ message: "Missing event or location id" });
		}
		const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
		const resultInvitation = await database.query(
			sqlInvitation,
			[userId, eventId],
			userId,
		);
		if (
			!resultInvitation ||
			!resultInvitation.rows[0] ||
			!resultInvitation.rows[0].id
		) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (
			resultInvitation.rows.length === 0 ||
			!(await hasEventPermission(userId, eventId, Event.EDIT_INVITATION))
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const invitationId = resultInvitation.rows[0].id;
		const state = variableValidator(req.body.state) ? req.body.state : null;
		if (!state) {
			return res.status(400).json({ message: "Missing or invalid state" });
		}
		const sql = `INSERT INTO location_response (invitation_id, location_id, state) VALUES (?, ?, ?)`;
		const result = await database.query(
			sql,
			[invitationId, locationId, state],
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

export const getLocationResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (!eventId || !locationId) {
			return res.status(400).json({ message: "Missing event or location id" });
		}
		if (await hasEventPermission(userId, eventId, Event.VIEW)) {
			const sql = `SELECT u.username, lr.state, l.name FROM location_response lr INNER JOIN locations l ON l.id = lr.location_id INNER JOIN invitation i ON i.id = lr.invitation_id INNER JOIN users u ON i.user_id = u.id WHERE lr.location_id = ?`;
			const result = await database.query(sql, [locationId], userId);
			if (!result) {
				return res.status(500).json({ message: "Internal server error" });
			}
			return res.status(200).json(result.rows);
		} else {
			return res.status(403).json({ message: "Forbidden" });
		}
	} catch (err) {
		next(err);
	}
};

export const deleteLocationResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (!eventId || !locationId) {
			return res.status(400).json({ message: "Missing event or location id" });
		}
		const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
		const resultInvitation = await database.query(
			sqlInvitation,
			[userId, eventId],
			userId,
		);
		if (
			!resultInvitation ||
			!resultInvitation.rows[0] ||
			!resultInvitation.rows[0].id
		) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (
			resultInvitation.rows.length === 0 ||
			!(await hasEventPermission(userId, eventId, Event.EDIT_INVITATION))
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const invitationId = resultInvitation.rows[0].id;
		const sql = `DELETE FROM location_response WHERE invitation_id = ? AND location_id = ?`;
		const result = await database.query(
			sql,
			[invitationId, locationId],
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

export const updateLocationResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (!eventId || !locationId) {
			return res.status(400).json({ message: "Missing event or location id" });
		}
		const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
		const resultInvitation = await database.query(
			sqlInvitation,
			[userId, eventId],
			userId,
		);
		if (
			!resultInvitation ||
			!resultInvitation.rows[0] ||
			!resultInvitation.rows[0].id
		) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (
			resultInvitation.rows.length === 0 ||
			!(await hasEventPermission(userId, eventId, Event.EDIT_INVITATION))
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const invitationId = resultInvitation.rows[0].id;
		const state = variableValidator(req.body.state) ? req.body.state : null;
		if (!state) {
			return res.status(400).json({ message: "Missing or invalid state" });
		}
		const sql = `UPDATE location_response SET state = ? WHERE invitation_id = ? AND location_id = ?`;
		const result = await database.query(
			sql,
			[state, invitationId, locationId],
			userId,
		);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
	} catch (err) {
		next(err);
	}
};

export const updateFullLocationResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		const locationId = variableValidator(req.params.location_id)
			? Number(req.params.location_id)
			: null;
		if (!eventId || !locationId) {
			return res.status(400).json({ message: "Missing event or location id" });
		}
		const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
		const resultInvitation = await database.query(
			sqlInvitation,
			[userId, eventId],
			userId,
		);
		if (
			!resultInvitation ||
			!resultInvitation.rows[0] ||
			!resultInvitation.rows[0].id
		) {
			return res.status(500).json({ message: "Internal server error" });
		}
		if (
			resultInvitation.rows.length === 0 ||
			!(await hasEventPermission(userId, eventId, Event.EDIT_INVITATION))
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const invitationId = resultInvitation.rows[0].id;
		const state = variableValidator(req.body.state) ? req.body.state : null;
		if (!state) {
			return res.status(400).json({ message: "Missing or invalid state" });
		}
		const sql = `UPDATE location_response SET state = ? WHERE invitation_id = ? AND location_id = ?`;

		await ifMatchValidator(
			req,
			`SELECT * FROM location_response WHERE invitation_id = ? AND location_id = ?`,
			[invitationId, locationId],
		);

		const result = await database.query(
			sql,
			[state, invitationId, locationId],
			userId,
		);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
	} catch (err) {
		next(err);
	}
};

export const getAllDateResponses = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		if (!eventId) {
			return res.status(400).json({ message: "Missing event id" });
		}
		if (await hasEventPermission(userId, eventId, Event.VIEW)) {
			const sql = `SELECT dr.date_id, dr.state, i.user_id FROM date_response dr INNER JOIN invitation i ON i.id = dr.invitation_id WHERE i.event_id = ?`;
			const result = await database.query(sql, [eventId], userId);
			return res.status(200).json(result.rows);
		}
		return res.status(403).json({ message: "Forbidden" });
	} catch (err) {
		next(err);
	}
};

export const getAllLocationResponses = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		if (!eventId) {
			return res.status(400).json({ message: "Missing event id" });
		}
		if (await hasEventPermission(userId, eventId, Event.VIEW)) {
			const sql = `SELECT l.name, lr.state, i.user_id FROM location_response lr INNER JOIN invitation i ON i.id = lr.invitation_id INNER JOIN locations l ON l.id = lr.location_id WHERE i.event_id = ?`;
			const result = await database.query(sql, [eventId], userId);
			return res.status(200).json(result.rows);
		}
		return res.status(403).json({ message: "Forbidden" });
	} catch (err) {
		next(err);
	}
};
