import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validateBody(schema: ZodSchema) {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			const firstError = result.error.errors[0];
			return res.status(400).json({
				message: firstError?.message ?? "Validation error",
				errors: result.error.flatten().fieldErrors,
			});
		}
		req.body = result.data;
		next();
	};
}
