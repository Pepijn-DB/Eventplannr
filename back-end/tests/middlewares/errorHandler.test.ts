/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mocks> */
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AppError, errorHandler, getErrors } from "../../src/middlewares/errorHandler.js";

describe("errorHandler middleware", () => {
  beforeEach(() => {
    // clear internal list returned by getErrors()
    const arr = getErrors();
    arr.splice(0, arr.length);
  });

  it("AppError sets status and message", () => {
    const e = new AppError("boom", 400);
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(400);
    expect(e.message).toBe("boom");
  });

  it("errorHandler pushes error and responds with status and message", () => {
    const req: any = { path: "/x" };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    const err = new AppError("uh oh", 418);
    errorHandler(err, req, res);

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({ message: "uh oh" });

    const arr = getErrors();
    expect(arr.length).toBe(1);
    // @ts-expect-error
    expect(arr[0].err).toBe(err);
    // @ts-expect-error
    expect(arr[0].req).toBe(req);
  });

  it("errorHandler uses defaults when message/status falsy", () => {
    const req: any = { path: "/y" };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };

    // simulate a thrown object without message/status
    const fake: any = { message: "", status: undefined };
    errorHandler(fake as any, req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });

    const arr = getErrors();
    expect(arr.length).toBe(1);
    // @ts-expect-error
    expect(arr[0].err).toBe(fake);
  });
});

