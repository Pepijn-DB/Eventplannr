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

function getRequestVariables(req: AuthRequest, needsId: boolean = false) {
	try {
		const userId = userValidator(req);
		const eventId = eventValidator(req);
		let requestedUserId: number = -1;
		if (variableValidator(req.params.user_id)) {
			requestedUserId = Number(req.params.user_id);
		} else if (variableValidator(req.body.user_id)) {
			requestedUserId = Number(req.body.user_id);
		}
		let id: number | null = -1;
		let type = "";
		if (req.path.includes("/date")) {
			id = variableValidator(req.params.date_id)
				? Number(req.params.date_id)
				: -1;
			type = "date";
		} else if (req.path.includes("/location")) {
			id = variableValidator(req.params.location_id)
				? Number(req.params.location_id)
				: -1;
			type = "location";
		}

		if (
			!eventId ||
			!requestedUserId ||
			(needsId && id < -1) ||
			Number.isNaN(id) ||
			Number.isNaN(requestedUserId) ||
			requestedUserId < 0
		) {
			let missing = "";
			if (!eventId) missing += "event id, ";
			if (!requestedUserId) missing += "user id, ";
			missing = missing.slice(0, -2);
			throw new AppError(`Missing or invalid ${missing} or invalid`, 400);
		}
		if (needsId && id === -1) {
			throw new AppError(`Missing ${type} id`, 400);
		}

		return {
			id: id,
			userId: userId,
			eventId: eventId,
			requestedUserId: requestedUserId,
		};
	} catch (err) {
		if (err instanceof AppError) {
			throw err;
		}
		throw new AppError("Internal server error", 500);
	}
}

async function getInvitationId(
	userId: number,
	eventId: number,
	requester: number = -1,
): Promise<number> {
	if (requester === -1) {
		requester = userId;
	}

	const sqlInvitation = `SELECT i.id FROM invitation i JOIN events e ON e.id = i.event_id WHERE i.user_id = ? AND e.id = ?`;
	const resultInvitation = await database.query(
		sqlInvitation,
		[userId, eventId],
		requester,
	);
	if (resultInvitation && resultInvitation.rows.length === 0) {
		throw new AppError("Forbidden", 403);
	}
	if (
		!resultInvitation ||
		!resultInvitation.rows[0] ||
		!resultInvitation.rows[0].id
	) {
		throw new AppError("Internal server error", 500);
	}
	try {
		return Number(resultInvitation.rows[0].id);
	} catch (err) {
		if (err instanceof AppError) {
			throw err;
		}
		throw new AppError("Internal server error", 500);
	}
}

export const createDateResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const {
			userId,
			eventId,
			requestedUserId,
			id: dateId,
		} = getRequestVariables(req, true);
		const invitationId = await getInvitationId(userId, eventId);
		if (
			!(await hasEventPermission(userId, eventId, Event.EDIT_ALL)) &&
			requestedUserId !== userId
		) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const state = variableValidator(req.body.state) ? req.body.state : null;
		if (!state) {
			return res.status(400).json({ message: "Missing or invalid state" });
		}

		const sql = `INSERT INTO date_response (invitation_id, date_id, state) VALUES (?, ?, ?)`;
		await database.query(
			sql,
			[invitationId, dateId, state],
			userId,
		);
		return res.status(200).json({ message: "Date response created" });
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
		const {
			userId,
			eventId,
			requestedUserId,
			id: dateId,
		} = getRequestVariables(req, true);
		if (await hasEventPermission(userId, eventId, Event.VIEW)) {
			const sql = `SELECT u.username, dr.state, ed.date FROM date_response dr INNER JOIN event_dates ed ON ed.id = dr.date_id INNER JOIN invitation i ON i.id = dr.invitation_id INNER JOIN users u ON i.user_id = u.id WHERE dr.date_id = ? AND i.user_id = ?`;
			const result = await database.query(
				sql,
				[dateId, requestedUserId],
				userId,
			);
			if (!result) {
				return res.status(500).json({ message: "Internal server error" });
			}
			return res.status(200).json({ result: result.rows });
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
		const {
			userId,
			eventId,
			requestedUserId,
			id: dateId,
		} = getRequestVariables(req, true);
		const invitationId = await getInvitationId(
			requestedUserId,
			eventId,
			userId,
		);
		if (
			!(await hasEventPermission(userId, eventId, Event.EDIT_ALL)) &&
			requestedUserId !== userId
		) {
			return res.status(403).json({ message: "Forbidden" });
		}

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
		return res.status(204).json();
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
		const {
			userId,
			eventId,
			requestedUserId,
			id: dateId,
		} = getRequestVariables(req, true);
		const invitationId = await getInvitationId(
			requestedUserId,
			eventId,
			userId,
		);
		if (
			!(await hasEventPermission(userId, eventId, Event.EDIT_ALL)) &&
			requestedUserId !== userId
		) {
			return res.status(403).json({ message: "Forbidden" });
		}

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
		return res.status(204).json();
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
		const {
			userId,
			eventId,
			requestedUserId,
			id: dateId,
		} = getRequestVariables(req, true);
		const invitationId = await getInvitationId(
			requestedUserId,
			eventId,
			userId,
		);
		if (
			!(await hasEventPermission(userId, eventId, Event.EDIT_ALL)) &&
			requestedUserId !== userId
		) {
			return res.status(403).json({ message: "Forbidden" });
		}

		const sql = `DELETE FROM date_response WHERE invitation_id = ? AND date_id = ?`;
		const result = await database.query(sql, [invitationId, dateId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(204).json();
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
		const {
			userId,
			eventId,
			requestedUserId,
			id: locationId,
		} = getRequestVariables(req, true);
		const invitationId = await getInvitationId(userId, eventId, userId);
		if (
			!(await hasEventPermission(userId, eventId, Event.EDIT_ALL)) &&
			requestedUserId !== userId
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const state = variableValidator(req.body.state) ? req.body.state : null;
		if (!state) {
			return res.status(400).json({ message: "Missing or invalid state" });
		}
		const sql = `INSERT INTO location_response (invitation_id, location_id, state) VALUES (?, ?, ?)`;
		await database.query(
			sql,
			[invitationId, locationId, state],
			userId,
		);
		return res.status(201).json({
			message: "Location response created successfully",
		});
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
		const {
			userId,
			eventId,
			requestedUserId,
			id: locationId,
		} = getRequestVariables(req, true);
		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `SELECT u.username, lr.state, l.name FROM location_response lr INNER JOIN locations l ON l.id = lr.location_id INNER JOIN invitation i ON i.id = lr.invitation_id INNER JOIN users u ON i.user_id = u.id WHERE lr.location_id = ? AND i.user_id = ?`;
		const result = await database.query(
			sql,
			[locationId, requestedUserId],
			userId,
		);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json({ result: result.rows });
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
		const {
			userId,
			eventId,
			requestedUserId,
			id: locationId,
		} = getRequestVariables(req, true);
		const invitationId = await getInvitationId(
			requestedUserId,
			eventId,
			userId,
		);
		if (
			!(await hasEventPermission(userId, eventId, Event.EDIT_ALL)) &&
			requestedUserId !== userId
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `DELETE FROM location_response WHERE invitation_id = ? AND location_id = ?`;
		const result = await database.query(
			sql,
			[invitationId, locationId],
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

export const updateLocationResponse = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const {
			userId,
			eventId,
			requestedUserId,
			id: locationId,
		} = getRequestVariables(req, true);
		const invitationId = await getInvitationId(
			requestedUserId,
			eventId,
			userId,
		);
		if (
			!(await hasEventPermission(userId, eventId, Event.EDIT_ALL)) &&
			requestedUserId !== userId
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
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
		return res.status(204).json();
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
		const {
			userId,
			eventId,
			requestedUserId,
			id: locationId,
		} = getRequestVariables(req, true);
		const invitationId = await getInvitationId(
			requestedUserId,
			eventId,
			userId,
		);
		if (
			!(await hasEventPermission(userId, eventId, Event.EDIT_ALL)) &&
			requestedUserId !== userId
		) {
			return res.status(403).json({ message: "Forbidden" });
		}
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
		return res.status(204).json();
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
		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `SELECT dr.date_id, dr.state, i.user_id FROM date_response dr INNER JOIN invitation i ON i.id = dr.invitation_id WHERE i.event_id = ?`;
		const result = await database.query(sql, [eventId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json({ result: result.rows });
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
		if (!(await hasEventPermission(userId, eventId, Event.VIEW))) {
			return res.status(403).json({ message: "Forbidden" });
		}
		const sql = `SELECT l.name, lr.state, i.user_id FROM location_response lr INNER JOIN invitation i ON i.id = lr.invitation_id INNER JOIN locations l ON l.id = lr.location_id WHERE i.event_id = ?`;
		const result = await database.query(sql, [eventId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json({ result: result.rows });
	} catch (err) {
		next(err);
	}
};
