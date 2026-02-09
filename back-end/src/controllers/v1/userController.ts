import type { NextFunction, Response } from "express";
import type { AuthRequest } from "../../app.js";

// TODO Remove all underscores

export const getUsers = (
	_req: AuthRequest,
	_res: Response,
	_next: NextFunction,
) => {};

export const getUser = (
	req: AuthRequest,
	_res: Response,
	_next: NextFunction,
) => {
	const _userId = req.params.id;
};

export const createUser = (
	_req: AuthRequest,
	_res: Response,
	_next: NextFunction,
) => {};

export const updateUser = (
	req: AuthRequest,
	_res: Response,
	_next: NextFunction,
) => {
	const _userId = req.params.id;
};

export const deleteUser = (
	req: AuthRequest,
	_res: Response,
	_next: NextFunction,
) => {
	const _userId = req.params.id;
};
