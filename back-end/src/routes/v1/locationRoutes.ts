import { Router } from "express";

import {
	createLocation,
	deleteLocation,
	getLocation,
	getLocations,
	updateFullLocation,
	updateLocation,
} from "../../controllers/v1/locationController.js";

const router = Router();

router.get("/", getLocations);
router.post("/", createLocation);

router.get("/:location_id", getLocation);
router.patch("/:location_id", updateLocation);
router.put("/:location_id", updateFullLocation);
router.delete("/:location_id", deleteLocation);

export default router;
