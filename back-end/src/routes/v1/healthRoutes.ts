import { Router } from "express";
import { getHealth } from "../../controllers/v1/healthController.js";
import { healthRateLimiter } from "../../middlewares/v1/rateLimitHandler.js";

const router = Router();

router.get("/", healthRateLimiter, getHealth);

export default router;
