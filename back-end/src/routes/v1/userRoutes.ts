import { Router } from "express";
import { getUserInvitations } from "../../controllers/v1/invitationController.js";
import {
	createUser,
	createUserPermission,
	deleteUser,
	deleteUserPermission,
	getUser,
	getUserPermissions,
	getUsers,
	updateFullUser,
	updateFullUserPermission,
	updateUser,
	updateUserPermission,
} from "../../controllers/v1/userController.js";

const router = Router();

router.get("/", getUsers);

router.post("/", createUser);
router.delete("/:id", deleteUser);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.put("/:id", updateFullUser);

router.get("/:id/invitations", getUserInvitations);

router.get("/:id/permissions", getUserPermissions);
router.post("/:id/permissions", createUserPermission);
router.delete("/:id/permissions/:permission_id", deleteUserPermission);
router.patch("/:id/permissions/:permission_id", updateUserPermission);
router.put("/:id/permissions/:permission_id", updateFullUserPermission);

export default router;
