import type {Response, NextFunction} from 'express';
import type {AuthRequest} from "../../app.js";
import type {User} from "../../models/user.js";

import {AppError} from "../../middlewares/errorHandler.js";

import jwt from 'jsonwebtoken';
import Config from "../../config/config.js";
import {emailValidator} from "../../validators/emailValidator.js";
import {arrayValidator, variableValidator} from "../../validators/variableValidator.js";

export const getToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (Config.secret === 'null') {
            next(new AppError("Server not configured", 500));
            return;
        }

        if (variableValidator(req.body)) return res.status(400).json(
            {message: "Missing body"}
        )
    } catch (error) {
        next(error);
    }
    try {
        const { email, password } = req.body;

        if (!arrayValidator([email, password])) return res.status(400).json(
            {message: "Missing email or password"}
        );

        else if (!(emailValidator(email))) {
            return res.status(400).json({message: "Invalid email"});
        }

        //TODO Authenticate user
        const userId = 1;
        const username = "test";

        const payload: User = {
            id: userId,
            username: username,
            email: email,
        }

        const token = jwt.sign(payload, Config.secret, {
            expiresIn: '1d'
        });

        res.status(200).json({token: token});
    } catch (error) {
        next(error);
    }
};
