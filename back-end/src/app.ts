import express from 'express';
import authRoutes from './routes/v1/authRoutes.js';
import userRoutes from './routes/v1/userRoutes.js';
import eventRoutes from './routes/v1/eventRoutes.js';
import type {User} from "./models/user.js";

import { checkToken } from "./middlewares/v1/authHandler.js";
import { errorHandler } from './middlewares/errorHandler.js';

import type {JwtPayload} from "jsonwebtoken";
import type {Request} from "express";

export interface AuthRequest extends Request {
    user?: JwtPayload | User | string
}

const app = express();

app.use(express.json());

app.use(checkToken);

// Routes V1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/event', eventRoutes)

app.use(errorHandler);

app.use((req: AuthRequest,res)=> {
    res.status(404).json({
        'message': 'Route not found'
    });
});

export default app;