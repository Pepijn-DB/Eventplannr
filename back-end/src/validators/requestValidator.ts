import type { AuthRequest } from "../app.js";
import { AppError } from "../middlewares/errorHandler.js";
import {getETag} from "../services/eTagService.js";

export function userValidator(req: AuthRequest): number {
	if (!req.user) throw new AppError("Unauthorized", 401);
	return req.user.id;
}

export function eventValidator(req: AuthRequest): number {
	if (!req.params.event_id) throw new AppError("Missing event id", 400);
	if (Number.isNaN(Number(req.params.event_id)))
		throw new AppError("Invalid event id", 400);
	return Number(req.params.event_id);
}

export function invitationValidator(req: AuthRequest): number {
	if (!req.params.invitation_id)
		throw new AppError("Missing invitation id", 400);
	if (Number.isNaN(Number(req.params.invitation_id)))
		throw new AppError("Invalid invitation id", 400);
	return Number(req.params.invitation_id);
}

export async function ifMatchValidator(
	req: AuthRequest,
	table: string,
	id: number,
): Promise<boolean> {
	const ifMatchHeader = req.get("If-Match") ?? req.headers["if-match"];
	if (!ifMatchHeader) {
		throw new AppError("Missing If-Match header", 428);
	}
	const reqEventHash = Array.isArray(ifMatchHeader)
		? ifMatchHeader[0]
		: ifMatchHeader;

	if (await getETag(req, table, id) !== reqEventHash) {
		throw new AppError("Precondition failed", 412);
	}
	return true;
}
