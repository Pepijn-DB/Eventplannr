import type { AuthRequest } from "../app.js";
import hash from "../models/hash.js";
import { userValidator } from "../validators/requestValidator.js";
import database from "./databaseService.js";

export async function getETag(
	req: AuthRequest,
	table: string,
	id: number,
): Promise<string> {
	const userId = userValidator(req);

	switch (table) {

	}

}
