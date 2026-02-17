import { Router } from "express";
import { getUserInvitations } from "../../controllers/v1/invitationController.js";
import {
	createUser,
	deleteUser,
	getUser,
	getUsers,
	updateUser,
} from "../../controllers/v1/userController.js";

const router = Router();

router.get("/", getUsers);

router.post("/", createUser);
router.delete("/:id", deleteUser);
router.get("/:id", getUser);
router.patch("/:id", updateUser);

router.get("/:id/invitations", getUserInvitations);

export default router;
