import type { Response, NextFunction} from 'express';
import type {AuthRequest} from "../../app.js";
import database from "../../services/databaseService.js";
import {AppError} from "../../middlewares/errorHandler.js";
import {eventValidator, userValidator} from "../../validators/requestValidator.js";

async function isEventOrganizer(eventId: number, userId: number): Promise<boolean> {
    const sql = `
            SELECT e.*
            FROM events e
            WHERE e.event_id = ?
        `;

    const resultEvent = await database.query(sql, [userId, eventId], userId);
    if (!resultEvent) throw new AppError("Internal server error", 500);

    if (resultEvent.rows.length === 0) throw new AppError("Event not found", 400);

    const sqlInvitations = `
            SELECT i.*
            FROM invitation i
            WHERE i.event_id = ? AND i.user_id = ? AND i.role = 'ORGANIZER'
            LIMIT 1
        `;
    const resultInvitations = await database.query(sqlInvitations, [eventId, userId], userId);

    return ((resultEvent.rows.length > 0 && !(resultEvent.rows[0].creator_user === userId)) && resultInvitations.rows.length > 0);
}

export const getEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = userValidator(req);

        const sql = `
            SELECT e.*
            FROM events e
            INNER JOIN invitation i ON i.event_id = e.event_id
            WHERE i.user_id = ?
            ORDER BY e.event_date DESC
        `;

        const result = await database.query(sql, [userId], userId);
        if (!result) throw new AppError("Internal server error");

        return res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
}

export const getEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = userValidator(req);
        const eventId = eventValidator(req);

        const sql = `
            SELECT e.*
            FROM events e
            INNER JOIN invitation i ON i.event_id = e.event_id
            WHERE i.user_id = ? AND e.event_id = ?
        `;

        const result = await database.query(sql, [userId, eventId], userId);
        if (!result) throw new AppError("Internal server error");

        return res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
}

export const createEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const {title, description} = req.body;
    if (!title) return res.status(400).json({message: "Missing title"});
    try {
        const userId = userValidator(req);

        const sql = `
            INSERT INTO events (creator_user, title, description, status)
            VALUES (?, ?, ?, OPEN)
        `;

        const result = await database.query(sql, [userId, title, description], userId);
        if (!result) throw new AppError("Internal server error");

        return res.status(201).json({message: "Event created"});
    } catch (err) {
        next(err);
    }
}

export const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let sql = `UPDATE events SET`
    const params: any[] = [];

    try{
        const userId = userValidator(req);
        const eventId = eventValidator(req);

        if (!(await isEventOrganizer(eventId, userId))) return res.status(403).json({message: "Forbidden"});

        if (req.body.title) {
            sql += ` title = ?,`;
            params.push(req.body.title);
        }
        if (req.body.description) {
            sql += ` description = ?,`;
            params.push(req.body.description);
        }
        if (req.body.status) {
            sql += ` status = ?,`;
            if (req.body.status !== "CLOSED" || req.body.status !== "OPEN" || req.body.status !== "CANCELLED" || req.body.status !== "DRAFT") {
                return res.status(400).json({message: "Invalid status"});
            }
            params.push(req.body.status);
        }
        if (!req.body.title && !req.body.description && !req.body.status) return res.status(400).json({message: "Nothing to update"});

        sql = `${sql.slice(0, -1)} WHERE event_id = ?`;
        params.push(eventId);

        await database.query(sql, params, userId);
    } catch (err) {
        next(err);
    }

    return res.status(200).json({message: "Event updated"});
}

export const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = userValidator(req);
        const eventId = eventValidator(req);

        if (!(await isEventOrganizer(eventId, userId))) return res.status(403).json({message: "Forbidden"});

        const sqlDelete = `DELETE FROM events WHERE event_id = ?`;
        await database.query(sqlDelete, [eventId], userId);
        return res.status(200).json({message: "Event deleted"});
    } catch (err) {
        next(err);
    }
}