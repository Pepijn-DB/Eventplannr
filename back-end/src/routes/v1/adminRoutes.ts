import { Router } from "express";

import { getLogs } from "../../controllers/v1/adminController.js";

const router = Router();

router.get("/logs", getLogs);

export default router;
