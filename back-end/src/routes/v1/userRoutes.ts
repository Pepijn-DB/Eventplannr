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
import {
	validateBody,
	validateQuery,
} from "../../middlewares/validateRequest.js";
import {
	createUserPermissionSchema,
	createUserSchema,
	getUserInvitationsQuerySchema,
	getUsersQuerySchema,
	updateFullUserSchema,
	updateUserPermissionSchema,
	updateUserSchema,
} from "../../schemas/index.js";

const router = Router();

router.get("/", validateQuery(getUsersQuerySchema), getUsers);

router.post("/", validateBody(createUserSchema), createUser);
router.delete("/:id", deleteUser);
router.get("/:id", getUser);
router.patch("/:id", validateBody(updateUserSchema), updateUser);
router.put("/:id", validateBody(updateFullUserSchema), updateFullUser);

router.get(
	"/:id/invitations",
	validateQuery(getUserInvitationsQuerySchema),
	getUserInvitations,
);

router.get("/:id/permissions", getUserPermissions);
router.post(
	"/:id/permissions",
	validateBody(createUserPermissionSchema),
	createUserPermission,
);
router.delete(
	"/:id/permissions",
	validateBody(createUserPermissionSchema),
	deleteUserPermission,
);
router.patch(
	"/:id/permissions",
	validateBody(updateUserPermissionSchema),
	updateUserPermission,
);
router.put(
	"/:id/permissions",
	validateBody(updateUserPermissionSchema),
	updateFullUserPermission,
);

export default router;
