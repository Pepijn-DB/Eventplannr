import type { Response } from "express";
import rateLimit from "express-rate-limit";
import type { AuthRequest } from "../../app.js";
import Config from "../../config/config.js";

export const rateLimiter = rateLimit({
	// 15-minute total time
	windowMs: 15 * 60 * 1000,

	limit: 100,
	message: {
		error: "Too many requests from this IP address",
		retryAfter: "15 minutes",
		documentation: `${Config.cors_url}/docs`,
	},
	standardHeaders: true,

	legacyHeaders: false,

	handler: (req: AuthRequest, res: Response) => {
		res.status(429).json({
			error: "Rate limit exceeded",

			message: "Too many requests from this IP, please try again later",

			retryAfter:
				req.rateLimit !== undefined
					? Math.round(req.rateLimit.resetTime / 1000)
					: new Date().getSeconds() + 3600,
		});
	},
});

export const healthRateLimiter = rateLimit({
	windowMs: 60 * 1000,
	limit: 1,
	standardHeaders: true,
	legacyHeaders: false,
	handler: (_req, res: Response) => {
		res.status(429).json({
			error: "Rate limit exceeded",
			message: "Health endpoint can only be called once per minute",
		});
	},
});

export const authRateLimiter = rateLimit({
	// 10-minute total time
	windowMs: 10 * 60 * 1000,
	limit: 5,
	message: {
		error: "Too many authentication attempts",

		retryAfter: "10 minutes",
	},
	standardHeaders: true,
	legacyHeaders: false,
	skipSuccessfulRequests: true,
});
