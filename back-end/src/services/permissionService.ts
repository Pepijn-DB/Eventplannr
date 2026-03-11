import { Event, Global, Location } from "../models/permissions.js";
import database from "../services/databaseService.js";

export async function hasEventPermission(
	user: number,
	event: number,
	permission: Event,
	requester: number = user,
): Promise<boolean> {
	switch (permission) {
		case Event.VIEW: {
			const sqlInv = `SELECT i.user_id, i.event_id, i.role FROM invitation i WHERE i.user_id = ? AND i.event_id = ?`;
			const resultInv = await database.query(sqlInv, [user, event], requester);
			return (
				resultInv.rows.length > 0 ||
				(await hasGlobalPermission(user, Global.VIEW_ALL_EVENTS)) ||
				(await hasEventPermission(user, event, Event.EDIT_ALL))
			);
		}
		case Event.EDIT_DETAILS: {
			return hasEventPermission(user, event, Event.EDIT_ALL);
		}
		case Event.EDIT_LOCATION: {
			const sqlInv = `SELECT i.user_id, i.event_id, i.role FROM invitation i WHERE i.user_id = ? AND i.event_id = ? AND (i.role = ORGANIZER OR i.role = LOCATION_PICKER)`;
			const resultInv = await database.query(sqlInv, [user, event], requester);
			return (
				resultInv.rows.length > 0 ||
				(await hasGlobalPermission(user, Global.EDIT_ALL_EVENTS)) ||
				(await hasEventPermission(user, event, Event.EDIT_ALL))
			);
		}
		case Event.EDIT_INVITATION: {
			{
				const sqlInv = `SELECT i.user_id, i.event_id, i.role FROM invitation i WHERE i.user_id = ? AND i.event_id = ? AND i.role = ORGANIZER`;
				const resultInv = await database.query(sqlInv, [user, event], requester);
				return (
					resultInv.rows.length > 0 ||
					(await hasGlobalPermission(user, Global.EDIT_ALL_INVITATIONS)) ||
					(await hasEventPermission(user, event, Event.EDIT_ALL))
				);
			}
		}
		case Event.EDIT_DATE: {
			const sql = `SELECT i.user_id, i.event_id, i.role FROM invitation i WHERE i.user_id = ? AND i.event_id = ? AND (i.role = DATE_PICKER or i.role = ORGANIZER)`;
			const result = await database.query(sql, [user, event], requester);
			return (
				result.rows.length > 0 ||
				(await hasGlobalPermission(user, Global.EDIT_ALL_EVENTS)) ||
				(await hasEventPermission(user, event, Event.EDIT_ALL))
			);
		}
		case Event.EDIT_ALL: {
			const sqlInv = `SELECT i.user_id, i.event_id, i.role FROM invitation i WHERE i.user_id = ? AND i.event_id = ? AND i.role = ORGANIZER`;
			const sqlEvent = `SELECT e.id, e.creator_id FROM events e WHERE e.creator_id = ? AND e.id = ?`;
			const resultInv = await database.query(sqlInv, [user, event], requester);
			const resultEvent = await database.query(sqlEvent, [user, event], requester);
			return (
				resultEvent.rows.length > 0 ||
				resultInv.rows.length > 0 ||
				(await hasGlobalPermission(user, Global.EDIT_ALL_EVENTS))
			);
		}
		default:
			return false;
	}
}

export async function hasGlobalPermission(
	user: number,
	permission: Global,
	requester: number = user,
): Promise<boolean> {
	switch (permission) {
		case Global.ACCESS_APP: {
			return true;
		}
		case Global.VIEW_ALL_USERS: {
			return await hasGlobalPermission(user, Global.ADMIN_USER);
		}
		case Global.VIEW_ALL_EVENTS: {
			return await hasGlobalPermission(user, Global.ADMIN_EVENT);
		}
		case Global.VIEW_ALL_INVITATIONS: {
			return await hasGlobalPermission(user, Global.VIEW_ALL_EVENTS);
		}
		case Global.VIEW_ALL_LOCATIONS: {
			return await hasGlobalPermission(user, Global.ADMIN_ALL);
		}
		case Global.VIEW_ALL_PERMISSIONS: {
			return await hasGlobalPermission(user, Global.ADMIN_ALL);
		}
		case Global.VIEW_ALL_RESPONSES: {
			return await hasGlobalPermission(user, Global.VIEW_ALL_EVENTS);
		}
		case Global.VIEW_LOG: {
			return await hasGlobalPermission(user, Global.ADMIN_ALL);
		}
		case Global.EDIT_ALL_USERS: {
			return await hasGlobalPermission(user, Global.ADMIN_USER);
		}
		case Global.EDIT_ALL_EVENTS: {
			return await hasGlobalPermission(user, Global.ADMIN_EVENT);
		}
		case Global.EDIT_ALL_INVITATIONS: {
			return await hasGlobalPermission(user, Global.EDIT_ALL_EVENTS);
		}
		case Global.EDIT_ALL_LOCATIONS: {
			return await hasGlobalPermission(user, Global.ADMIN_ALL);
		}
		case Global.EDIT_ALL_PERMISSIONS: {
			return await hasGlobalPermission(user, Global.ADMIN_ALL);
		}
		case Global.EDIT_ALL_RESPONSES: {
			return await hasGlobalPermission(user, Global.EDIT_ALL_EVENTS);
		}
		case Global.ADMIN_LOCATION: {
			return await hasGlobalPermission(user, Global.ADMIN_ALL);
		}
		case Global.ADMIN_USER: {
			const sql = `SELECT up.user_id, up.permission FROM user_permission up WHERE up.user_id = ? AND up.permission = 'USER_ADMIN' LIMIT 1`;
			const result = await database.query(sql, [user], requester);
			return (
				result.rows.length > 0 ||
				(await hasGlobalPermission(user, Global.ADMIN_ALL))
			);
		}
		case Global.ADMIN_EVENT: {
			const sql = `SELECT up.user_id, up.permission FROM user_permission up WHERE up.user_id = ? AND up.permission = 'EVENT_ADMIN' LIMIT 1`;
			const result = await database.query(sql, [user], requester);
			return (
				result.rows.length > 0 ||
				(await hasGlobalPermission(user, Global.ADMIN_ALL))
			);
		}
		case Global.ADMIN_ALL: {
			const sql = `SELECT up.user_id, up.permission FROM user_permission up WHERE up.user_id = ? AND up.permission = 'GLOBAL_ADMIN' LIMIT 1`;
			const result = await database.query(sql, [user], requester);
			return result.rows.length > 0;
		}
		default:
			return false;
	}
}

export async function hasLocationPermission(
	user: number,
	location: number,
	permission: Location,
	requester: number = user,
): Promise<boolean> {
	switch (permission) {
		case Location.VIEW: {
			const sql = `SELECT event_id FROM invitation i WHERE i.user_id = ? AND i.event_id IN (SELECT el.event_id FROM event_locations el JOIN locations l ON l.id = el.location_id WHERE l.id = ?)`;
			const result = await database.query(sql, [user, location], requester);
			return (
				result.rows.length > 0 ||
				hasLocationPermission(user, location, Location.EDIT_ALL)
			);
		}
		case Location.EDIT_ALL: {
			const sql = `SELECT l.id, l.creator_user FROM locations l WHERE l.creator_id = ? AND l.id = ?`;
			const result = await database.query(sql, [user, location], requester);
			return (
				result.rows.length > 0 ||
				(await hasGlobalPermission(user, Global.ADMIN_LOCATION))
			);
		}
		default:
			return false;
	}
}
