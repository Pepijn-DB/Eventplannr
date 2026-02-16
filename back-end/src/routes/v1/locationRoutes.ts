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

router.get("/:location_id", getLocation);
router.post("/:location_id", updateLocation);
router.delete("/:location_id", deleteLocation);

export default router;
