import { Router } from "express";

import {
	createLocation,
	deleteLocation,
	getLocation,
	getLocations,
	updateFullLocation,
	updateLocation,
} from "../../controllers/v1/locationController.js";
import {
	validateBody,
	validateQuery,
} from "../../middlewares/validateRequest.js";
import {
	createLocationSchema,
	getLocationsQuerySchema,
	updateLocationSchema,
} from "../../schemas/index.js";

const router = Router();

router.get("/", validateQuery(getLocationsQuerySchema), getLocations);
router.post("/", validateBody(createLocationSchema), createLocation);

router.get("/:location_id", getLocation);
router.patch(
	"/:location_id",
	validateBody(updateLocationSchema),
	updateLocation,
);
router.put(
	"/:location_id",
	validateBody(updateLocationSchema),
	updateFullLocation,
);
router.delete("/:location_id", deleteLocation);

export default router;
