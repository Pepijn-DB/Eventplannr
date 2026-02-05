import type { Response, NextFunction} from 'express';
import type {AuthRequest} from "../../app.js";

export const getUsers = (req: AuthRequest, res: Response, next: NextFunction) => {

}

export const getUser = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.params.id;
}

export const createUser = (req: AuthRequest, res: Response, next: NextFunction) => {

}

export const updateUser = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.params.id;
}

export const deleteUser = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.params.id;
}