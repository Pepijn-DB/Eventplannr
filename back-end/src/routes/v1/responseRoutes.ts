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
import { validateBody } from "../../middlewares/validateRequest.js";
import { responseStateSchema } from "../../schemas/index.js";

const router = Router();

router.get("/:event_id/date", getAllDateResponses);
router.post(
	"/:event_id/date/:date_id",
	validateBody(responseStateSchema),
	createDateResponse,
);

router.get("/:event_id/date/:date_id/:user_id", getDateResponse);
router.delete("/:event_id/date/:date_id/:user_id", deleteDateResponse);
router.patch(
	"/:event_id/date/:date_id/:user_id",
	validateBody(responseStateSchema),
	updateDateResponse,
);
router.put(
	"/:event_id/date/:date_id/:user_id",
	validateBody(responseStateSchema),
	updateFullDateResponse,
);

router.get("/:event_id/location", getAllLocationResponses);
router.post(
	"/:event_id/location/:location_id",
	validateBody(responseStateSchema),
	createLocationResponse,
);

router.get("/:event_id/location/:location_id/:user_id", getLocationResponse);
router.delete(
	"/:event_id/location/:location_id/:user_id",
	deleteLocationResponse,
);
router.patch(
	"/:event_id/location/:location_id/:user_id",
	validateBody(responseStateSchema),
	updateLocationResponse,
);
router.put(
	"/:event_id/location/:location_id/:user_id",
	validateBody(responseStateSchema),
	updateFullLocationResponse,
);

export default router;
