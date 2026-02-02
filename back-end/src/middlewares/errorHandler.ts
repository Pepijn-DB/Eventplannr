import type {NextFunction, Request, Response} from 'express';

export class AppError extends Error {
    status?: number;
}

let listErrors:Error[] = [];

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    listErrors.push(err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
    });
};