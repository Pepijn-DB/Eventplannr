import { Router } from "express";
import {
	createEventDate,
	deleteEventDate,
	getEventDate,
	getEventDates,
	updateEventDate,
	updateFullEventDate,
} from "../../controllers/v1/dateController.js";
import {
	createEvent,
	deleteEvent,
	getEvent,
	getEvents,
	updateEvent,
	updateFullEvent,
} from "../../controllers/v1/eventController.js";
import {
	createInvitation,
	deleteInvitation,
	getInvitation,
	getInvitations,
	updateFullInvitation,
	updateInvitation,
} from "../../controllers/v1/invitationController.js";
import {
	createEventLocation,
	deleteEventLocation,
	getEventLocation,
	getEventLocations,
	updateEventLocation,
	updateFullEventLocation,
} from "../../controllers/v1/locationController.js";
import {
	validateBody,
	validateQuery,
} from "../../middlewares/validateRequest.js";
import {
	createEventDateSchema,
	createEventLocationSchema,
	createEventSchema,
	createInvitationSchema,
	getEventDatesQuerySchema,
	getEventLocationsQuerySchema,
	getEventsQuerySchema,
	getInvitationsQuerySchema,
	updateEventDateSchema,
	updateEventLocationSchema,
	updateEventSchema,
	updateFullEventSchema,
	updateInvitationSchema,
} from "../../schemas/index.js";

const router = Router();

router.get("/", validateQuery(getEventsQuerySchema), getEvents);
router.post("/", validateBody(createEventSchema), createEvent);

router.get("/:event_id", getEvent);
router.delete("/:event_id", deleteEvent);
router.patch("/:event_id", validateBody(updateEventSchema), updateEvent);
router.put("/:event_id", validateBody(updateFullEventSchema), updateFullEvent);

router.get(
	"/:event_id/invitation",
	validateQuery(getInvitationsQuerySchema),
	getInvitations,
);
router.post(
	"/:event_id/invitation",
	validateBody(createInvitationSchema),
	createInvitation,
);

router.get("/:event_id/invitation/:invitation_id", getInvitation);
router.delete("/:event_id/invitation/:invitation_id", deleteInvitation);
router.patch(
	"/:event_id/invitation/:invitation_id",
	validateBody(updateInvitationSchema),
	updateInvitation,
);
router.put(
	"/:event_id/invitation/:invitation_id",
	validateBody(updateInvitationSchema),
	updateFullInvitation,
);

router.get(
	"/:event_id/location",
	validateQuery(getEventLocationsQuerySchema),
	getEventLocations,
);
router.post(
	"/:event_id/location",
	validateBody(createEventLocationSchema),
	createEventLocation,
);

router.get("/:event_id/location/:location_id", getEventLocation);
router.delete("/:event_id/location/:location_id", deleteEventLocation);
router.patch(
	"/:event_id/location/:location_id",
	validateBody(updateEventLocationSchema),
	updateEventLocation,
);
router.put(
	"/:event_id/location/:location_id",
	validateBody(updateEventLocationSchema),
	updateFullEventLocation,
);

router.get(
	"/:event_id/date",
	validateQuery(getEventDatesQuerySchema),
	getEventDates,
);
router.post(
	"/:event_id/date",
	validateBody(createEventDateSchema),
	createEventDate,
);

router.get("/:event_id/date/:date_id", getEventDate);
router.delete("/:event_id/date/:date_id", deleteEventDate);
router.patch(
	"/:event_id/date/:date_id",
	validateBody(updateEventDateSchema),
	updateEventDate,
);
router.put(
	"/:event_id/date/:date_id",
	validateBody(updateEventDateSchema),
	updateFullEventDate,
);

export default router;
