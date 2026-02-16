import { Router } from "express";

import {
    createDateResponse,
    createLocationResponse,
    deleteDateResponse,
    deleteLocationResponse,
    getDateResponse,
    getLocationResponse,
    updateDateResponse,
    updateLocationResponse
} from "../../controllers/v1/responseController.js";

const router = Router();

router.put("/:event_id/date/:date_id", createDateResponse);
router.get("/:event_id/date/:date_id", getDateResponse);
router.delete("/:event_id/date/:date_id", deleteDateResponse);
router.post("/:event_id/date/:date_id", updateDateResponse);

router.put("/:event_id/location/:location_id", createLocationResponse);
router.get("/:event_id/location/:location_id", getLocationResponse);
router.delete("/:event_id/location/:location_id", deleteLocationResponse);
router.post("/:event_id/location/:location_id", updateLocationResponse);

export default router