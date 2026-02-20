import type { Response } from "express";
import rateLimit from "express-rate-limit";
import type { AuthRequest } from "../../app.js";

export const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,

	limit: 100,
	message: {
		error: "Too many requests from this IP address",
		retryAfter: "15 minutes",
		//TODO Link to docs
		documentation: "https://api.example.com/docs/rate-limits",
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

export const authRateLimiter = rateLimit({
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
