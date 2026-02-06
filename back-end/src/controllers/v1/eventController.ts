import type { Response, NextFunction} from 'express';
import type {AuthRequest} from "../../app.js";
import database from "../../services/databaseService.js";
import {AppError} from "../../middlewares/errorHandler.js";

export const getEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({message: "Unauthorized"});
    const userId = req.user.id;

    try {
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
    if (!req.user) return res.status(401).json({message: "Unauthorized"});
    const userId = req.user.id;
    if (!req.params.id) return res.status(400).json({message: "Missing event id"});
    if (Number.isNaN(Number(req.params.id))) return res.status(400).json({message: "Invalid event id"});
    const eventId = Number(req.params.id);

    try {
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
    if (!req.user) return res.status(401).json({message: "Unauthorized"});
    const userId = req.user.id;
    const {title, description} = req.body;
    if (!title) return res.status(400).json({message: "Missing title"});
    try {
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
    if (!req.user) return res.status(401).json({message: "Unauthorized"});
    const userId = req.user.id;
    if (!req.params.id) return res.status(400).json({message: "Missing event id"});
    if (Number.isNaN(Number(req.params.id))) return res.status(400).json({message: "Invalid event id"});
    const eventId = Number(req.params.id);

    let sql = `UPDATE events SET`
    const params: any[] = [];

    try{
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
    if (!req.user) return res.status(401).json({message: "Unauthorized"});
    const userId = req.user.id;
    if (!req.params.id) return res.status(400).json({message: "Missing event id"});
    if (Number.isNaN(Number(req.params.id))) return res.status(400).json({message: "Invalid event id"});
    const eventId = Number(req.params.id);

    try {
        const sql = `
            SELECT e.*
            FROM events e
            WHERE e.event_id = ?
        `;

        const resultEvent = await database.query(sql, [userId, eventId], userId);
        if (!resultEvent) throw new AppError("Internal server error");

        if (resultEvent.rows.length === 0) return res.status(404).json({message: "Event not found"});
        if (resultEvent.rows.length > 0 && !(resultEvent.rows[0].creator_user === userId)) return res.status(403).json({message: "Forbidden"});

        const sqlDelete = `DELETE FROM events WHERE event_id = ?`;
        await database.query(sqlDelete, [eventId], userId);
        return res.status(200).json({message: "Event deleted"});
    } catch (err) {
        next(err);
    }
}