import type { Response, NextFunction} from 'express';
import type {AuthRequest} from "../../app.js";

export const getInvitations = (req: AuthRequest, res: Response, next: NextFunction) => {
    const eventId = req.params.id;
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