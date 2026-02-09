import { Router } from "express";
import { getToken } from "../../controllers/v1/authController.js";

const router = Router();

router.get("/token", getToken);

export default router;
