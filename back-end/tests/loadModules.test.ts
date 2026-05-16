/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { describe, expect, it } from "bun:test";

// This test ensures that each module can be imported without throwing.
// It is intentionally light-weight: it only checks module loadability so we can
// get baseline coverage for modules that currently lack focused unit tests.

const MODULES = [
	"../../src/models/hash",
	"../../src/models/location",
	"../../src/models/event",
	"../../src/models/maybepromise",
	"../../src/models/user",
	"../../src/models/strnum",
	"../../src/models/permissions",
	"../../src/validators/variableValidator",
	"../../src/validators/requestValidator",
	"../../src/validators/emailValidator",
	"../../src/middlewares/errorHandler",
	"../../src/middlewares/v1/authHandler",
	"../../src/middlewares/v1/rateLimitHandler",
	"../../src/app",
	"../../src/config/config",
	"../../src/routes/v1/userRoutes",
	"../../src/routes/v1/responseRoutes",
	"../../src/routes/v1/locationRoutes",
	"../../src/routes/v1/eventRoutes",
	"../../src/routes/v1/authRoutes",
	"../../src/routes/v1/adminRoutes",
	"../../src/controllers/v1/userController",
	"../../src/controllers/v1/responseController",
	"../../src/controllers/v1/locationController",
	"../../src/controllers/v1/invitationController",
	"../../src/controllers/v1/eventController",
	"../../src/controllers/v1/dateController",
	"../../src/controllers/v1/authController",
	"../../src/controllers/v1/adminController",
	"bun"
];

describe("module load smoke tests", () => {
	for (const m of MODULES) {
		it(`imports ${m}`, async () => {
			const mod = await import(m);
			expect(mod).toBeDefined();
		});
	}
});
