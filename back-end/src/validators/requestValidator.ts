import type {AuthRequest} from "../app.js";
import {AppError} from "../middlewares/errorHandler.js";


export function userValidator(req: AuthRequest): number {
    if (!req.user) throw new AppError("Unauthorized", 401);
    return req.user.id;
}

export function eventValidator(req: AuthRequest): number {
    if (!req.params.id) throw new AppError("Missing event id", 400);
    if (Number.isNaN(Number(req.params.id))) throw new AppError("Invalid event id", 400);
    return Number(req.params.id);
}

export default {userValidator, eventValidator};