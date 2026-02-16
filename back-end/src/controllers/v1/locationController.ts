import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";
import { Location } from "../../models/permissions.js";
import database from "../../services/databaseService.js";
import { hasLocationPermission } from "../../services/permissionService.js";
import { userValidator } from "../../validators/requestValidator.js";
import { variableValidator } from "../../validators/variableValidator.js";

export const getLocations = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const sql = `SELECT l.id, l.name
					 FROM locations l
					 WHERE l.creator_user = ?`;
		const result = await database.query(sql, [userId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (err) {
		next(err);
	}
};

export const getLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const locationId = variableValidator(req.params.id)
			? Number(req.params.id)
			: null;
		if (!locationId)
			return res.status(400).json({ message: "Missing location id" });
		if (!(await hasLocationPermission(userId, locationId, Location.VIEW)))
			return res.status(403).json({ message: "Forbidden" });
		const sql = `SELECT l.id, l.name
					 FROM locations l
					 WHERE l.creator_user = ? AND l.id = ?`;
		const result = await database.query(sql, [userId, locationId], userId);
		if (!result) {
			return res.status(500).json({ message: "Internal server error" });
		}
		return res.status(200).json(result.rows);
	} catch (error) {
		next(error);
	}
};

export const deleteLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const locationId = variableValidator(req.params.id)
			? Number(req.params.id)
			: null;
		if (!locationId)
			return res.status(400).json({ message: "Missing location id" });
		if (!(await hasLocationPermission(userId, locationId, Location.EDIT_ALL)))
			return res.status(403).json({ message: "Forbidden" });
		const sql = `DELETE FROM locations WHERE id = ?`;
		await database.query(sql, [locationId], userId);
		return res.status(200).json({ message: "Location deleted successfully" });
	} catch (error) {
		next(error);
	}
};

export const createLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const locationName = variableValidator(req.body.name)
			? req.body.name
			: null;
		if (!locationName)
			return res.status(400).json({ message: "Missing location name" });
		const sql = `INSERT INTO locations (creator_user, name) VALUES (?, ?)`;
		await database.query(sql, [userId, locationName], userId);
		return res.status(201).json({ message: "Location created successfully" });
	} catch (error) {
		next(error);
	}
};

export const updateLocation = async (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const userId = userValidator(req);
		const locationId = variableValidator(req.params.id)
			? Number(req.params.id)
			: null;
		if (!locationId)
			return res.status(400).json({ message: "Missing location id" });
		if (!(await hasLocationPermission(userId, locationId, Location.EDIT_ALL)))
			return res.status(403).json({ message: "Forbidden" });
		const sql = `UPDATE locations SET name = ? WHERE id = ?`;
		const locationName = variableValidator(req.body.name)
			? req.body.name
			: null;
		if (!locationName)
			return res.status(400).json({ message: "Missing location name" });
		await database.query(sql, [locationName, locationId], userId);
		return res.status(200).json({ message: "Location updated successfully" });
	} catch (error) {
		next(error);
	}
};
