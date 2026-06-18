import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import * as z from "zod";

export function validateBody(schema: ZodSchema) {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			const firstError = result.error.issues[0];
			return res.status(400).json({
				message: firstError?.message ?? "Validation error",
				errors: z.flattenError(result.error),
			});
		}
		req.body = result.data;
		next();
	};
}
