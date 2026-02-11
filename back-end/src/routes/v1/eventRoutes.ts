import { Router } from "express";
import {
	createEvent,
	deleteEvent,
	getEvent,
	getEvents,
	updateEvent,
} from "../../controllers/v1/eventController.js";

import {
	createInvitation,
	deleteInvitation,
	getInvitation,
	getInvitations,
	updateInvitation,
} from "../../controllers/v1/invitationController.js";

const router = Router();

router.get("/", getEvents); // Get all events (created and invited)

router.put("/", createEvent); // Create a new event
router.get("/:event_id", getEvent); // Get event by id
router.delete("/:event_id", deleteEvent); // Delete event by id
router.post("/:event_id", updateEvent); // Update event by id

router.get("/:event_id/invitation", getInvitations); // Get invitations for event
router.put("/:event_id/invitation", createInvitation); // Invite user to an event

router.get("/:event_id/invitation/:invitation_id", getInvitation); // Get invitation by id
router.delete("/:event_id/invitation/:invitation_id", deleteInvitation); // Delete invitation by id
router.post("/:event_id/invitation/:invitation_id", updateInvitation); // Update invitation by id

export default router;
