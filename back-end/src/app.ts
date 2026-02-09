// Express imports
import type { Request, Response } from "express";
import express from "express";

import { errorHandler } from "./middlewares/errorHandler.js";
import { checkToken } from "./middlewares/v1/authHandler.js";

import type { User } from "./models/user.js";

import authRoutes from "./routes/v1/authRoutes.js";
import eventRoutes from "./routes/v1/eventRoutes.js";
import userRoutes from "./routes/v1/userRoutes.js";

export interface AuthRequest extends Request {
	user?: User;
}

const app = express();

app.use(express.json());

app.use(checkToken);

// Routes V1
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/event", eventRoutes);

app.use(errorHandler);

app.use((res: Response) => {
	res.status(404).json({
		message: "Route not found",
	});
});

export default app;
