import type { NextFunction, Response } from "express";
import type {AuthRequest} from "../../app.js";

export default function paginationHandler(
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
) {
    const q = req.query || {};

    function toPositiveInt(v: unknown, fallback: number | undefined): number | undefined {
        if (v === undefined) return fallback;
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) return fallback;
        return Math.floor(n);
    }

    const page = toPositiveInt(q.page, undefined);
    const per_page = toPositiveInt(q.per_page ?? q.perPage ?? q.limit, undefined);
    const limit = toPositiveInt(q.limit ?? q.per_page ?? q.perPage, undefined);
    const offset = toPositiveInt(q.offset, undefined);

    const pagination: { limit?: number; offset?: number; page?: number; per_page?: number } = {};
    if (page !== undefined) pagination.page = page;
    if (per_page !== undefined) pagination.per_page = per_page;
    if (limit !== undefined) pagination.limit = limit;
    if (offset !== undefined) pagination.offset = offset;

    if (pagination.page !== undefined && pagination.per_page !== undefined) {
        pagination.limit = pagination.per_page;
        pagination.offset = (pagination.page - 1) * pagination.per_page;
    }

    (req as any).pagination = pagination;

    next();
}

