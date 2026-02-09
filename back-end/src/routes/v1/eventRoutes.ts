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
router.get("/:id", getEvent); // Get event by id
router.delete("/:id", deleteEvent); // Delete event by id
router.post("/:id", updateEvent); // Update event by id

router.get("/:id/invitation", getInvitations); // Get invitations for event
router.put("/:id/invitation", createInvitation); // Invite user to an event

router.get("/:id/invitation/:invitationId", getInvitation); // Get invitation by id
router.delete("/:id/invitation/:invitationId", deleteInvitation); // Delete invitation by id
router.post("/:id/invitation/:invitationId", updateInvitation); // Update invitation by id

export default router;
