import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../app.js";
import logger from "../services/loggerService.js";

function generateRequestId(): string {
	return crypto.randomUUID();
}

const requestLogger = (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) => {
	const requestId = generateRequestId();
	req.requestId = requestId;
	res.setHeader("X-Request-ID", requestId);

	const start = Date.now();

	logger.info(`→ ${req.method} ${req.path}`, {
		requestId,
		ip: req.ip,
		userAgent: req.headers["user-agent"],
	});

	res.on("finish", () => {
		const duration = Date.now() - start;
		const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

		logger[level](`← ${req.method} ${req.path}`, {
			requestId,
			status: res.statusCode,
			durationMs: duration,
			userId: req.user?.id,
		});
	});

	next();
};

export default requestLogger;
