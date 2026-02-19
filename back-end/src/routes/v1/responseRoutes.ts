import { Router } from "express";

import {
	createDateResponse,
	createLocationResponse,
	deleteDateResponse,
	deleteLocationResponse,
	getAllDateResponses,
	getAllLocationResponses,
	getDateResponse,
	getLocationResponse,
	updateDateResponse,
	updateFullDateResponse,
	updateFullLocationResponse,
	updateLocationResponse,
} from "../../controllers/v1/responseController.js";

const router = Router();

router.get("/:event_id/date", getAllDateResponses);
router.get("/:event_id/location", getAllLocationResponses);

router.post("/:event_id/date/:date_id", createDateResponse);
router.get("/:event_id/date/:date_id", getDateResponse);
router.delete("/:event_id/date/:date_id", deleteDateResponse);
router.patch("/:event_id/date/:date_id", updateDateResponse);
router.put("/:event_id/date/:date_id", updateFullDateResponse);

router.post("/:event_id/location/:location_id", createLocationResponse);
router.get("/:event_id/location/:location_id", getLocationResponse);
router.delete("/:event_id/location/:location_id", deleteLocationResponse);
router.patch("/:event_id/location/:location_id", updateLocationResponse);
router.put("/:event_id/location/:location_id", updateFullLocationResponse);

export default router;
