import * as fs from "node:fs";
import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../app.js";
import logger from "../services/loggerService.js";

export class AppError extends Error {
	constructor(message: string, status?: number, ErrorOptions?: ErrorOptions) {
		super(message, ErrorOptions);
		this.status = status || 500;
	}

	status: number;
}

export interface SanitizedRequest {
	method: string | undefined;
	path: string | undefined;
	url: string | undefined;
	headers: Record<string, string | undefined> | undefined;
}

interface ErrorEntry {
	err: AppError | Error;
	req: SanitizedRequest;
	ts: number; // timestamp
}

const ERRORS_MAX = Number(process.env.ERRORS_MAX) || 100;
const listErrors: ErrorEntry[] = [];

function sanitizeRequest(req: AuthRequest): SanitizedRequest {
	const headers: Record<string, string | undefined> = {};
	if (req && typeof req === "object" && req.headers) {
		for (const [k, v] of Object.entries(
			req.headers as Record<string, unknown>,
		)) {
			try {
				if (typeof v === "string" || typeof v === "number") {
					headers[k] = String(v);
				}
			} catch (_e) {}
		}
	}

	return {
		method: (req && (req.method as string)) || undefined,
		path: (req && (req.path as string)) || undefined,
		url: (req && (req.url as string)) || undefined,
		headers: Object.keys(headers).length ? headers : undefined,
	};
}

export const errorHandler = (
	err: AppError | Error,
	req: AuthRequest,
	res: Response,
	_next: NextFunction,
) => {
	const entry: ErrorEntry = { err, req: sanitizeRequest(req), ts: Date.now() };
	listErrors.push(entry);
	if (listErrors.length > ERRORS_MAX) listErrors.shift();

	// biome-ignore lint/suspicious/noExplicitAny: <AppError and Error may not have message/status properties>
	const status = (err as any).status || 500;
	logger.error((err as any).message || "Internal Server Error", {
		requestId: req.requestId,
		status,
		method: req.method,
		path: req.path,
		stack: err.stack,
	});

	const ERRORS_LOG_PATH = process.env.ERRORS_LOG_PATH || "";
	if (ERRORS_LOG_PATH) {
		const line = JSON.stringify({
			ts: entry.ts,
			// biome-ignore lint/suspicious/noExplicitAny: <AppError and Error may not have message/status properties>
			message: (err as any).message,
			// biome-ignore lint/suspicious/noExplicitAny: <AppError and Error may not have message/status properties>
			status: (err as any).status || 500,
			req: entry.req,
		});
		fs.promises.appendFile(ERRORS_LOG_PATH, `${line}\n`).catch(() => {});
	}
	res.status(status).json({
		// biome-ignore lint/suspicious/noExplicitAny: <AppError and Error may not have message/status properties>
		message: (err as any).message || "Internal Server Error",
	});
};

export const getErrors = (): ErrorEntry[] => listErrors;
