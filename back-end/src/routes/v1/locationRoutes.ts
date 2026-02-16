import { Router } from "express";

import {
	createLocation,
	deleteLocation,
	getLocation,
	getLocations,
	updateLocation,
} from "../../controllers/v1/locationController.js";

const router = Router();

router.get("/", getLocations);
router.put("/", createLocation);

router.get("/:id", getLocation);
router.post("/:id", updateLocation);
router.delete("/:id", deleteLocation);

export default router;
