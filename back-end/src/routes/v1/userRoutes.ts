import { Router } from 'express';
import {
    createUser,
    deleteUser,
    getUser,
    updateUser,

    getUsers
} from '../../controllers/v1/userController.js';

const router = Router();

router.get('/', getUsers);

router.put('/', createUser);
router.delete('/:id', deleteUser);
router.get('/:id', getUser);
router.post('/:id', updateUser);

export default router;