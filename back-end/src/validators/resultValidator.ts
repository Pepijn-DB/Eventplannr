import {AppError} from "../middlewares/errorHandler.js";

// biome-ignore lint/suspicious/noExplicitAny: < Needs result as is used in databaseService, and result uses any >
export function validateResult(result: { rows: any[] }, needsRows: boolean = true) {
    if (result === null || result === undefined) {
        throw new AppError("Result returned null", 500)
    } else if (needsRows && result.rows !== null && result.rows !== undefined && result.rows.length === 0) {
        throw new AppError("No rows returned", 404)
    }
}