import { describe, expect, it } from "bun:test";
import {
	authTokenSchema,
	createEventSchema,
	createEventDateSchema,
	createInvitationSchema,
	createLocationSchema,
	createUserPermissionSchema,
	createUserSchema,
	updateEventSchema,
	updateFullEventSchema,
	updateFullUserSchema,
	updateUserSchema,
	updateInvitationSchema,
	updateUserPermissionSchema,
	createEventLocationSchema,
	updateLocationSchema,
	updateEventLocationSchema,
	responseStateSchema,
} from "../../src/schemas/index.js";

describe("authTokenSchema", () => {
	it("parses valid credentials", () => {
		const result = authTokenSchema.safeParse({ email: "a@b.com", password: "pass" });
		expect(result.success).toBe(true);
	});
	it("rejects invalid email", () => {
		const result = authTokenSchema.safeParse({ email: "notanemail", password: "pass" });
		expect(result.success).toBe(false);
	});
	it("rejects empty password", () => {
		const result = authTokenSchema.safeParse({ email: "a@b.com", password: "" });
		expect(result.success).toBe(false);
	});
});

describe("createUserSchema", () => {
	it("parses valid user", () => {
		const result = createUserSchema.safeParse({ username: "alice", email: "alice@test.com", password: "secret" });
		expect(result.success).toBe(true);
	});
	it("rejects empty username", () => {
		const result = createUserSchema.safeParse({ username: "", email: "alice@test.com", password: "secret" });
		expect(result.success).toBe(false);
	});
	it("rejects missing fields", () => {
		const result = createUserSchema.safeParse({ username: "alice" });
		expect(result.success).toBe(false);
	});
});

describe("updateUserSchema", () => {
	it("allows partial update with username only", () => {
		const result = updateUserSchema.safeParse({ username: "bob" });
		expect(result.success).toBe(true);
	});
	it("rejects when nothing to update", () => {
		const result = updateUserSchema.safeParse({});
		expect(result.success).toBe(false);
	});
	it("allows email-only update", () => {
		const result = updateUserSchema.safeParse({ email: "b@c.com" });
		expect(result.success).toBe(true);
	});
});

describe("updateFullUserSchema", () => {
	it("requires all fields", () => {
		const result = updateFullUserSchema.safeParse({ username: "x", email: "x@y.com", password: "p" });
		expect(result.success).toBe(true);
	});
	it("rejects when any field missing", () => {
		const result = updateFullUserSchema.safeParse({ username: "x", email: "x@y.com" });
		expect(result.success).toBe(false);
	});
});

describe("createUserPermissionSchema", () => {
	it("parses valid permission", () => {
		const result = createUserPermissionSchema.safeParse({ permission: "USER_ADMIN" });
		expect(result.success).toBe(true);
	});
	it("rejects invalid permission", () => {
		const result = createUserPermissionSchema.safeParse({ permission: "SUPERUSER" });
		expect(result.success).toBe(false);
	});
});

describe("updateUserPermissionSchema", () => {
	it("parses GLOBAL_ADMIN", () => {
		const result = updateUserPermissionSchema.safeParse({ permission: "GLOBAL_ADMIN" });
		expect(result.success).toBe(true);
	});
});

describe("createEventSchema", () => {
	it("parses valid event", () => {
		const result = createEventSchema.safeParse({ title: "Birthday" });
		expect(result.success).toBe(true);
	});
	it("allows optional description", () => {
		const result = createEventSchema.safeParse({ title: "Party", description: "Fun!" });
		expect(result.success).toBe(true);
	});
	it("rejects empty title", () => {
		const result = createEventSchema.safeParse({ title: "" });
		expect(result.success).toBe(false);
	});
});

describe("updateEventSchema", () => {
	it("allows status-only update", () => {
		const result = updateEventSchema.safeParse({ status: "OPEN" });
		expect(result.success).toBe(true);
	});
	it("rejects nothing to update", () => {
		const result = updateEventSchema.safeParse({});
		expect(result.success).toBe(false);
	});
	it("rejects invalid status", () => {
		const result = updateEventSchema.safeParse({ status: "INVALID" });
		expect(result.success).toBe(false);
	});
});

describe("updateFullEventSchema", () => {
	it("requires all fields", () => {
		const result = updateFullEventSchema.safeParse({ title: "T", description: "D", status: "CLOSED" });
		expect(result.success).toBe(true);
	});
	it("rejects missing status", () => {
		const result = updateFullEventSchema.safeParse({ title: "T", description: "D" });
		expect(result.success).toBe(false);
	});
});

describe("createInvitationSchema", () => {
	it("parses valid invitation with userId", () => {
		const result = createInvitationSchema.safeParse({ userId: 1 });
		expect(result.success).toBe(true);
	});
	it("parses invitation with role", () => {
		const result = createInvitationSchema.safeParse({ userId: 2, role: "ORGANIZER" });
		expect(result.success).toBe(true);
	});
	it("rejects negative userId", () => {
		const result = createInvitationSchema.safeParse({ userId: -1 });
		expect(result.success).toBe(false);
	});
});

describe("updateInvitationSchema", () => {
	it("parses valid role update", () => {
		const result = updateInvitationSchema.safeParse({ role: "GUEST" });
		expect(result.success).toBe(true);
	});
});

describe("createLocationSchema", () => {
	it("parses valid location", () => {
		const result = createLocationSchema.safeParse({ name: "Paris" });
		expect(result.success).toBe(true);
	});
	it("rejects empty name", () => {
		const result = createLocationSchema.safeParse({ name: "" });
		expect(result.success).toBe(false);
	});
});

describe("updateLocationSchema", () => {
	it("parses update with name", () => {
		const result = updateLocationSchema.safeParse({ name: "London" });
		expect(result.success).toBe(true);
	});
});

describe("createEventLocationSchema", () => {
	it("parses valid event location", () => {
		const result = createEventLocationSchema.safeParse({ location_id: 1 });
		expect(result.success).toBe(true);
	});
	it("rejects non-positive location_id", () => {
		const result = createEventLocationSchema.safeParse({ location_id: 0 });
		expect(result.success).toBe(false);
	});
});

describe("updateEventLocationSchema", () => {
	it("is defined", () => {
		expect(updateEventLocationSchema).toBeDefined();
	});
});

describe("responseStateSchema", () => {
	it("parses YES", () => {
		const result = responseStateSchema.safeParse({ state: "YES" });
		expect(result.success).toBe(true);
	});
	it("parses NO_RESPONSE", () => {
		const result = responseStateSchema.safeParse({ state: "NO_RESPONSE" });
		expect(result.success).toBe(true);
	});
	it("rejects invalid state", () => {
		const result = responseStateSchema.safeParse({ state: "UNKNOWN" });
		expect(result.success).toBe(false);
	});
});

describe("dateString validation (via createEventDateSchema)", () => {
	it("accepts valid date", () => {
		const result = createEventDateSchema.safeParse({ date: "2024-06-15" });
		expect(result.success).toBe(true);
	});
	it("rejects invalid date format", () => {
		const result = createEventDateSchema.safeParse({ date: "15-06-2024" });
		expect(result.success).toBe(false);
	});
	it("rejects invalid calendar date (month 13)", () => {
		const result = createEventDateSchema.safeParse({ date: "2024-13-01" });
		expect(result.success).toBe(false);
	});
	it("rejects invalid day 32", () => {
		const result = createEventDateSchema.safeParse({ date: "2024-01-32" });
		expect(result.success).toBe(false);
	});
	it("rejects non-date string matching format", () => {
		const result = createEventDateSchema.safeParse({ date: "abcd-ef-gh" });
		expect(result.success).toBe(false);
	});
});
