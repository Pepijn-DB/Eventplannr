import type { Response, NextFunction} from 'express';
import type {AuthRequest} from "../../app.js";
import databaseService from "../../services/databaseService.js";
import {userValidator, eventValidator} from "../../validators/requestValidator.js";
import {AppError} from "../../middlewares/errorHandler.js";

async function hasEventViewPermission(eventId: number, userId: number): Promise<boolean> {
    const sqlInvitations = `
       SELECT i.*
       FROM invitation i
       WHERE i.event_id = ? AND i.user_id = ?
     `;

    const sqlEvent = `
        SELECT e.*
        FROM events e
        WHERE e.event_id = ? AND e.creator_user = ?
    `;

    const resultInvitation = await databaseService.query(sqlInvitations, [eventId], userId);
    const resultEvent = await databaseService.query(sqlEvent, [eventId], userId)

    return resultInvitation.rows.length > 0 || resultEvent.rows.length > 0;
}

export const getInvitations = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = userValidator(req);
        const eventId = eventValidator(req);

        if (!(await hasEventViewPermission(eventId, userId))){
            return res.status(403).json({message: "Forbidden"});
        }
        const sql = `
            SELECT i.*
            FROM invitation i
            WHERE i.event_id = ?
        `;
        const result = await databaseService.query(sql, [eventId], userId);
        if (!result) throw new AppError("Internal server error");
        return res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
}

export const deleteInvitation = (req: AuthRequest, res: Response, next: NextFunction) => {
    const eventId = req.params.id;
    const invitationId = req.params.id;
}

export const createInvitation = (req: AuthRequest, res: Response, next: NextFunction) => {
    const eventId = req.params.id;
    const invitationId = req.params.id;
}

export const updateInvitation = (req: AuthRequest, res: Response, next: NextFunction) => {
    const eventId = req.params.id;
    const invitationId = req.params.id;
}

export const getInvitation = (req: AuthRequest, res: Response, next: NextFunction) => {
    const eventId = req.params.id;
    const invitationId = req.params.id;
}