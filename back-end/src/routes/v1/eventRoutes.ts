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

const router = Router();

router.get("/", getEvents); // Get all events (created and invited)

router.post("/", createEvent); // Create a new event
router.get("/:event_id", getEvent); // Get event by id
router.delete("/:event_id", deleteEvent); // Delete event by id
router.patch("/:event_id", updateEvent); // Update event by id
router.put("/:event_id", updateFullEvent); // Update event by id

router.get("/:event_id/invitation", getInvitations); // Get invitations for event
router.post("/:event_id/invitation", createInvitation); // Invite user to an event

router.get("/:event_id/invitation/:invitation_id", getInvitation); // Get invitation by id
router.delete("/:event_id/invitation/:invitation_id", deleteInvitation); // Delete invitation by id
router.patch("/:event_id/invitation/:invitation_id", updateInvitation); // Update invitation by id
router.put("/:event_id/invitation/:invitation_id", updateFullInvitation); // Update invitation by id

router.get("/:event_id/location", getEventLocations);
router.post("/:event_id/location", createEventLocation);

router.get("/:event_id/location/:location_id", getEventLocation);
router.delete("/:event_id/location/:location_id", deleteEventLocation);
router.patch("/:event_id/location/:location_id", updateEventLocation);
router.put("/:event_id/location/:location_id", updateFullEventLocation);

router.get("/:event_id/date", getEventDates);
router.post("/:event_id/date", createEventDate);

router.get("/:event_id/date/:date_id", getEventDate);
router.delete("/:event_id/date/:date_id", deleteEventDate);
router.patch("/:event_id/date/:date_id", updateEventDate);
router.put("/:event_id/date/:date_id", updateFullEventDate);

export default router;
