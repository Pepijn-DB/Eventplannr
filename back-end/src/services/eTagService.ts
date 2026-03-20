import type { AuthRequest } from "../app.js";
import hash from "../models/hash.js";
import { userValidator } from "../validators/requestValidator.js";
import database from "./databaseService.js";
import {AppError} from "../middlewares/errorHandler.js";

export async function getETag(
	req: AuthRequest,
	table: string,
	id: number,
): Promise<string> {
	const userId = userValidator(req);
	let sql: string;
	switch (table) {
		case 'events': {
			sql = `SELECT title, description, creator_user FROM events WHERE id = ?`;
			break;
		}
		case 'event_dates': {
			sql = `SELECT event_id, date FROM event_dates WHERE id = ?`;
			break;
		}
		case 'event_locations': {
			sql = `SELECT event_id, location_id FROM event_locations WHERE id = ?`;
			break;
		}

		case 'invitation': {
			sql = `SELECT event_id, user_id, role FROM invitations WHERE id = ?`;
			break;
		}
		case 'location_response': {
			sql = `SELECT location_id, invitation_id, state FROM location_responses WHERE id = ?`;
			break;
		}
		case 'date_response': {
			sql = `SELECT date_id, invitation_id, state FROM location_responses WHERE id = ?`;
			break;
		}
		
		case 'location': {
			sql = `SELECT name FROM locations WHERE id = ?`;
			break;
		}
		
		case 'users': {
			sql = `SELECT username, email, password_hash FROM users WHERE id = ?`;
			break;
		}
		case 'user_permissions': {
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
