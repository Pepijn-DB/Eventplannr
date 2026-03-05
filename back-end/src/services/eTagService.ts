import type { AuthRequest } from "../app.js";
import hash from "../models/hash.js";
import type { StrNum } from "../models/strnum.js";
import { userValidator } from "../validators/requestValidator.js";
import database from "./databaseService.js";

export async function generateETag(
	req: AuthRequest,
	sql: string,
	params: StrNum[] = [],
): Promise<string> {
	const userId = userValidator(req);
	const result = await database.query(sql, params, userId);
	return await hash(result.rows);
}
