import { Router } from 'express';
import {
    getEvents,
    getEvent,
    deleteEvent,
    updateEvent,
    createEvent
} from '../../controllers/v1/eventController.js';

import {
    getInvitations,
    deleteInvitation,
    createInvitation,
    updateInvitation,
    getInvitation
} from '../../controllers/v1/invitationController.js';

const router = Router();

router.get("/", getEvents);

router.put("/", createEvent);
router.get("/:id", getEvent);
router.delete("/:id", deleteEvent);
router.post("/:id", updateEvent);

router.get("/:id/invitation", getInvitations)
router.put("/:id/invitation", createInvitation);

router.get("/:id/invitation/:invitationId", getInvitation)
router.delete("/:id/invitation/:invitationId", deleteInvitation);
router.post("/:id/invitation/:invitationId", updateInvitation);



export default router;