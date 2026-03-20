import type { Response } from "express";
import type { AuthRequest } from "../app.js";
import { AppError } from "../middlewares/errorHandler.js";
import hash from "../models/hash.js";
import { userValidator } from "../validators/requestValidator.js";
import database from "./databaseService.js";

export async function setETag(
	req: AuthRequest,
	table: string,
	id: number,
	res: Response,
): Promise<void> {
	try {
		const hash = await getETag(req, table, id);

		res.setHeader("ETag", hash);
	} catch (err) {
		if (err instanceof AppError && err.message.includes("Invalid table")) {
			throw new AppError("Invalid table");
		} else if (err instanceof Error) {
			throw new AppError(err.message, 500, { cause: err });
		} else {
			throw new AppError("Internal server error", 500, { cause: err });
		}
	}
}

export async function getETag(
	req: AuthRequest,
	table: string,
	id: number,
): Promise<string> {
	const userId = userValidator(req);
	let sql: string;
	switch (table) {
		case "events": {
			sql = `SELECT title, description, creator_user FROM events WHERE id = ?`;
			break;
		}
		case "event_dates": {
			sql = `SELECT event_id, date FROM event_dates WHERE id = ?`;
			break;
		}
		case "event_locations": {
			sql = `SELECT event_id, location_id FROM event_locations WHERE id = ?`;
			break;
		}

		case "invitation": {
			sql = `SELECT event_id, user_id, role FROM invitation WHERE id = ?`;
			break;
		}
		case "location_response": {
			sql = `SELECT location_id, invitation_id, state FROM location_responses WHERE id = ?`;
			break;
		}
		case "date_response": {
			sql = `SELECT date_id, invitation_id, state FROM location_responses WHERE id = ?`;
			break;
		}

		case "location": {
			sql = `SELECT name FROM locations WHERE id = ?`;
			break;
		}

		case "users": {
			sql = `SELECT username, email, password_hash FROM users WHERE id = ?`;
			break;
		}
		case "user_permissions": {
			sql = `SELECT user_id, permission_id, enabled FROM user_permissions WHERE id = ?`;
			break;
		}

		default: {
			throw new AppError(`Invalid table: ${table}`);
		}
	}

	const result = await database.query(sql, [id], userId);

	return hash(result.rows[0], { algorithm: "SHA-256" });
}
