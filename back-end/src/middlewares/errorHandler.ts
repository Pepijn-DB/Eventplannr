import type { Response } from "express";
import type { AuthRequest } from "../app.js";

export class AppError extends Error {
	constructor(message: string, status?: number, ErrorOptions?: ErrorOptions) {
		super(message, ErrorOptions);
		this.status = status || 500;
	}

	status: number;
}

interface error {
	err: AppError;
	req: AuthRequest;
}

const listErrors: error[] = [];

export const errorHandler = (
	err: AppError,
	req: AuthRequest,
	res: Response,
) => {
	listErrors.push({ err, req });
	res.status(err.status || 500).json({
		message: err.message || "Internal Server Error",
	});
};

//To be implemented
export const _getErrors = (): error[] => listErrors;
