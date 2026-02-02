import express from 'express';
import authRoutes from './routes/v1/authRoutes.js';
import { checkToken } from "./middlewares/v1/authHandler.js";
import { errorHandler } from './middlewares/errorHandler.js';
export interface AuthRequest extends Request {
    user?: JwtPayload | string
}

const app = express();

app.use(express.json());

app.use(checkToken);

// Routes V1
app.use('/api/v1/auth', authRoutes);

app.use(errorHandler);

app.use(function(req,res){
app.use(function(req: AuthRequest,res){
    res.status(404).json({
        'message': 'Route not found'
    });
});

export default app;