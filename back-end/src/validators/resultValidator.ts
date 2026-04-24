import { AppError } from "../middlewares/errorHandler.js";

export function validateResult(
	// biome-ignore lint/suspicious/noExplicitAny: < Needs result as is used in databaseService, and result uses any >
	result: { rows: any[] },
	needsRows: boolean = true,
) {
	if (result === null || result === undefined) {
		throw new AppError("Result returned null", 500);
	} else if (
		needsRows &&
		result.rows !== null &&
		result.rows !== undefined &&
		result.rows.length === 0
	) {
		throw new AppError("No rows returned", 404);
	}
}
