import type { AuthRequest } from "../app.js";
import { AppError } from "../middlewares/errorHandler.js";

export function userValidator(req: AuthRequest): number {
	if (!req.user) throw new AppError("Unauthorized", 401);
	return req.user.id;
}

export function eventValidator(req: AuthRequest): number {
	if (!req.params.eventId) throw new AppError("Missing event id", 400);
	if (Number.isNaN(Number(req.params.eventId)))
		throw new AppError("Invalid event id", 400);
	return Number(req.params.eventId);
}

export function invitationValidator(req: AuthRequest): number {
	if (!req.params.invitationId)
		throw new AppError("Missing invitation id", 400);
	if (Number.isNaN(Number(req.params.invitationId)))
		throw new AppError("Invalid invitation id", 400);
	return Number(req.params.invitationId);
}
