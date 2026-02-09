import { Router } from 'express';
import {
    createUser,
    deleteUser,
    getUser,
    updateUser,

    getUsers
} from '../../controllers/v1/userController.js';
import {getUserInvitations} from '../../controllers/v1/invitationController.js';

const router = Router();

router.get('/', getUsers);

router.put('/', createUser);
router.delete('/:id', deleteUser);
router.get('/:id', getUser);
router.post('/:id', updateUser);

router.get('/:id/invitations', getUserInvitations);

export default router;