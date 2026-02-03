import type {Response, NextFunction} from 'express';
import type {AuthRequest} from "../../app.js";
import type {User} from "../../models/user.js";

import jwt from 'jsonwebtoken';
import Config from "../../config/config.js";
export const getToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (Config.secret === 'null') {
            next(new Error("Server not configured"));
            return;
        }

        if (req.body === undefined) return res.status(400).json(
            {message: "Missing body"}
        )
    } catch (error) {
        next(error);
    }
    try {
        const { email, password } = req.body;

        if (email === undefined || password === undefined || email === null || password === null) return res.status(400).json(
            {message: "Missing email or password"}
        );
        else if (!((email.split("@").length === 2) || (email.split(".").length >= 2))) {
            return res.status(400).json({message: "Invalid email"});
        }

        if (!email || !password) return res.status(400).json({message: "Missing email or password"});
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
