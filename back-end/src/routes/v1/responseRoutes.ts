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
router.post("/:event_id/date/:date_id", createDateResponse);

router.get("/:event_id/date/:date_id/:user_id", getDateResponse);
router.delete("/:event_id/date/:date_id/:user_id", deleteDateResponse);
router.patch("/:event_id/date/:date_id/:user_id", updateDateResponse);
router.put("/:event_id/date/:date_id/:user_id", updateFullDateResponse);

router.get("/:event_id/location", getAllLocationResponses);
router.post("/:event_id/location/:location_id", createLocationResponse);

router.get("/:event_id/location/:location_id/:user_id", getLocationResponse);
router.delete("/:event_id/location/:location_id/:user_id", deleteLocationResponse);
router.patch("/:event_id/location/:location_id/:user_id", updateLocationResponse);
router.put("/:event_id/location/:location_id/:user_id", updateFullLocationResponse);

export default router;
