import type {NextFunction, Request, Response} from 'express';
import type {AuthRequest} from "../app.js";

export class AppError extends Error{
    constructor(message: string, status?: number, ErrorOptions?: ErrorOptions) {
        super(message, ErrorOptions);
        this.status = status || 500;
    }

    status: number;
}

let listErrors:Error[] = [];

export const errorHandler = (
    err: AppError,
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    listErrors.push(err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
    });
};