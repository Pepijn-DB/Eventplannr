import { Router } from "express";
import { getToken } from "../../controllers/v1/authController.js";
import { validateBody } from "../../middlewares/validateRequest.js";
import { authTokenSchema } from "../../schemas/index.js";

const router = Router();

router.get("/token", validateBody(authTokenSchema), getToken);

export default router;
