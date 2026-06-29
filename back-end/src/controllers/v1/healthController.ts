import type { Request, Response } from "express";
import { connect } from "../../services/databaseService.js";

export async function getHealth(_req: Request, res: Response): Promise<void> {
	const dbOk = await connect();
	const status = dbOk ? "ok" : "degraded";
	res.status(dbOk ? 200 : 503).json({
		status,
		db: dbOk ? "connected" : "unavailable",
	});
}
