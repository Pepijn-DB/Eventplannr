import type {NextFunction, Request, Response} from 'express';

import jwt from 'jsonwebtoken';
import Config from "../../config/config.js";

const noAuthRequired: {[key: string]: string} = {
    "/api/v1/auth": "GET"
}

export const checkToken = (req: Request, res: Response, next: NextFunction) => {
    //Skip checking token for routes that don't require authentication
    if ((req.path in noAuthRequired) && req.method === noAuthRequired[req.path]) {
        return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({
            message: 'Unauthorized. No token provided.'
        });
    }

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'Unauthorized. No token provided.'
        });
    }

    try {
        req.body.user = jwt.verify(token, Config.secret);

        next();
    } catch (error) {
        return res.status(403).json({
            message: 'Forbidden - Invalid or expired token',
        });
    }
}