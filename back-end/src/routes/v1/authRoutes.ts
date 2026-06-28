import { Router } from "express";
import {
	getToken,
	logout,
	refreshToken,
} from "../../controllers/v1/authController.js";
import { validateBody } from "../../middlewares/validateRequest.js";
import { authRefreshSchema, authTokenSchema } from "../../schemas/index.js";

const router = Router();

router.post("/token", validateBody(authTokenSchema), getToken);
router.post("/refresh", validateBody(authRefreshSchema), refreshToken);
router.post("/logout", validateBody(authRefreshSchema), logout);

export default router;
