// Express imports
import type { NextFunction, Request, Response } from "express";
import express from "express";

import config from "./config/config.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { checkToken } from "./middlewares/v1/authHandler.js";
import {
	authRateLimiter,
	rateLimiter,
} from "./middlewares/v1/rateLimitHandler.js";

import type { User } from "./models/user.js";
import adminRoutes from "./routes/v1/adminRoutes.js";
import authRoutes from "./routes/v1/authRoutes.js";
import eventRoutes from "./routes/v1/eventRoutes.js";
import locationRoutes from "./routes/v1/locationRoutes.js";
import responseRoutes from "./routes/v1/responseRoutes.js";
import userRoutes from "./routes/v1/userRoutes.js";
import paginationHandler from "./middlewares/v1/paginationHandler.js";

export interface AuthRequest extends Request {
	user?: User;
	rateLimit?: { resetTime: number; remaining: number };
	pagination?: { limit?: number; offset?: number; page?: number; per_page?: number };
}

const app = express();

app.use(express.json());

app.use((_req: AuthRequest, res: Response, next: NextFunction) => {
	res.setHeader("Access-Control-Allow-Origin", config.cors_url);
	next();
});

app.use(rateLimiter);

app.use(paginationHandler);

app.use((req: AuthRequest, res: Response, next: NextFunction) => {
	if (req.rateLimit) {
		res.setHeader("X-RateLimit-Remaining", req.rateLimit.remaining);
		res.setHeader("X-RateLimit-Reset", req.rateLimit.resetTime);
	}
	next();
});

app.use(checkToken);

// Routes V1
app.use("/api/v1/auth", authRateLimiter, authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/event", eventRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/response", responseRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(errorHandler);

app.use((_req: AuthRequest, res: Response, _next: NextFunction) => {
	res.status(404).json({
		message: "Route not found",
	});
});

export default app;
