/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need any for mock objects> */
import { describe, expect, it, mock } from "bun:test";
import { Global, Event, Location } from "../../src/models/permissions.js";

const mockQuery = mock(async (_sql: string, _params: unknown[], _exec: number) => ({ rows: [] as any[] }));

await mock.module("../../src/services/databaseService.js", () => ({
	default: {
		query: mockQuery,
		connect: mock(async () => true),
		queryWithoutExecutioner: mock(async () => ({ rows: [] })),
		transaction: mock(async () => {}),
		parseQuery: mock(() => ({ action: null, table: null, where: null })),
	},
	query: mockQuery,
}));

import { AppError } from "../../src/middlewares/errorHandler.js";
const {
	hasGlobalPermission,
	needsGlobalPermission,
	hasEventPermission,
	needsEventPermission,
	hasLocationPermission,
	needsLocationPermission,
	needsSelfOrAdmin,
} = await import("../../src/services/permissionService.js");

function setQueryResult(rows: unknown[]) {
	mockQuery.mockImplementation(async () => ({ rows }));
}

describe("hasGlobalPermission", () => {
	it("returns true for ACCESS_APP always", async () => {
		expect(await hasGlobalPermission(1, Global.ACCESS_APP)).toBe(true);
	});

	it("returns false for ADMIN_ALL when no rows", async () => {
		setQueryResult([]);
		expect(await hasGlobalPermission(1, Global.ADMIN_ALL)).toBe(false);
	});

	it("returns true for ADMIN_ALL when rows returned", async () => {
		setQueryResult([{ user_id: 1, permission: "GLOBAL_ADMIN" }]);
		expect(await hasGlobalPermission(1, Global.ADMIN_ALL)).toBe(true);
	});

	it("returns true for ADMIN_USER when has GLOBAL_ADMIN", async () => {
		setQueryResult([{ user_id: 1, permission: "GLOBAL_ADMIN" }]);
		expect(await hasGlobalPermission(1, Global.ADMIN_USER)).toBe(true);
	});

	it("returns false for VIEW_ALL_USERS when no admin", async () => {
		setQueryResult([]);
		expect(await hasGlobalPermission(1, Global.VIEW_ALL_USERS)).toBe(false);
	});

	it("VIEW_ALL_EVENTS delegates to ADMIN_EVENT", async () => {
		setQueryResult([{ user_id: 1, permission: "EVENT_ADMIN" }]);
		expect(await hasGlobalPermission(1, Global.VIEW_ALL_EVENTS)).toBe(true);
	});

	it("VIEW_ALL_INVITATIONS delegates to VIEW_ALL_EVENTS", async () => {
		setQueryResult([{ user_id: 1, permission: "EVENT_ADMIN" }]);
		expect(await hasGlobalPermission(1, Global.VIEW_ALL_INVITATIONS)).toBe(true);
	});

	it("VIEW_ALL_LOCATIONS delegates to ADMIN_ALL", async () => {
		setQueryResult([]);
		expect(await hasGlobalPermission(1, Global.VIEW_ALL_LOCATIONS)).toBe(false);
	});

	it("VIEW_LOG delegates to ADMIN_ALL", async () => {
		setQueryResult([]);
		expect(await hasGlobalPermission(1, Global.VIEW_LOG)).toBe(false);
	});

	it("EDIT_ALL_USERS delegates to ADMIN_USER", async () => {
		setQueryResult([{ user_id: 1, permission: "USER_ADMIN" }]);
		expect(await hasGlobalPermission(1, Global.EDIT_ALL_USERS)).toBe(true);
	});

	it("EDIT_ALL_INVITATIONS delegates to EDIT_ALL_EVENTS", async () => {
		setQueryResult([{ user_id: 1, permission: "EVENT_ADMIN" }]);
		expect(await hasGlobalPermission(1, Global.EDIT_ALL_INVITATIONS)).toBe(true);
	});

	it("EDIT_ALL_LOCATIONS delegates to ADMIN_ALL", async () => {
		setQueryResult([]);
		expect(await hasGlobalPermission(1, Global.EDIT_ALL_LOCATIONS)).toBe(false);
	});

	it("EDIT_ALL_PERMISSIONS delegates to ADMIN_ALL", async () => {
		setQueryResult([]);
		expect(await hasGlobalPermission(1, Global.EDIT_ALL_PERMISSIONS)).toBe(false);
	});

	it("EDIT_ALL_RESPONSES delegates to EDIT_ALL_EVENTS", async () => {
		setQueryResult([{ user_id: 1, permission: "EVENT_ADMIN" }]);
		expect(await hasGlobalPermission(1, Global.EDIT_ALL_RESPONSES)).toBe(true);
	});

	it("ADMIN_LOCATION delegates to ADMIN_ALL", async () => {
		setQueryResult([]);
		expect(await hasGlobalPermission(1, Global.ADMIN_LOCATION)).toBe(false);
	});

	it("VIEW_ALL_PERMISSIONS delegates to ADMIN_ALL", async () => {
		setQueryResult([]);
		expect(await hasGlobalPermission(1, Global.VIEW_ALL_PERMISSIONS)).toBe(false);
	});

	it("VIEW_ALL_RESPONSES delegates to VIEW_ALL_EVENTS", async () => {
		setQueryResult([{ user_id: 1, permission: "EVENT_ADMIN" }]);
		expect(await hasGlobalPermission(1, Global.VIEW_ALL_RESPONSES)).toBe(true);
	});
});

describe("needsGlobalPermission", () => {
	it("does not throw when user has permission", async () => {
		setQueryResult([{ user_id: 1, permission: "GLOBAL_ADMIN" }]);
		await expect(
			needsGlobalPermission(1, Global.ADMIN_ALL),
		).resolves.toBeUndefined();
	});

	it("throws AppError 403 when user lacks permission", async () => {
		setQueryResult([]);
		try {
			await needsGlobalPermission(1, Global.ADMIN_ALL);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(403);
		}
	});
});

describe("hasEventPermission", () => {
	it("returns true for VIEW when user has invitation", async () => {
		setQueryResult([{ user_id: 1, event_id: 10, role: "GUEST" }]);
		expect(await hasEventPermission(1, 10, Event.VIEW)).toBe(true);
	});

	it("returns false for VIEW when no invitation and no global perm", async () => {
		setQueryResult([]);
		expect(await hasEventPermission(1, 10, Event.VIEW)).toBe(false);
	});

	it("EDIT_DETAILS delegates to EDIT_ALL", async () => {
		setQueryResult([{ user_id: 1, event_id: 10, role: "ORGANIZER" }]);
		expect(await hasEventPermission(1, 10, Event.EDIT_DETAILS)).toBe(true);
	});

	it("returns false for EDIT_LOCATION when no matching role", async () => {
		setQueryResult([]);
		expect(await hasEventPermission(1, 10, Event.EDIT_LOCATION)).toBe(false);
	});

	it("returns false for EDIT_INVITATION when no organizer", async () => {
		setQueryResult([]);
		expect(await hasEventPermission(1, 10, Event.EDIT_INVITATION)).toBe(false);
	});

	it("returns true for EDIT_INVITATION when organizer row returned", async () => {
		setQueryResult([{ user_id: 1, event_id: 10, role: "ORGANIZER" }]);
		expect(await hasEventPermission(1, 10, Event.EDIT_INVITATION)).toBe(true);
	});

	it("returns false for EDIT_DATE when no matching role", async () => {
		setQueryResult([]);
		expect(await hasEventPermission(1, 10, Event.EDIT_DATE)).toBe(false);
	});

	it("returns true for EDIT_DATE when date-picker row returned", async () => {
		setQueryResult([{ user_id: 1, event_id: 10, role: "DATE_PICKER" }]);
		expect(await hasEventPermission(1, 10, Event.EDIT_DATE)).toBe(true);
	});

	it("returns false for EDIT_ALL when not creator/organizer and no global perm", async () => {
		setQueryResult([]);
		expect(await hasEventPermission(1, 10, Event.EDIT_ALL)).toBe(false);
	});
});

describe("needsEventPermission", () => {
	it("throws 403 when user lacks event permission", async () => {
		setQueryResult([]);
		try {
			await needsEventPermission(1, 10, Event.VIEW);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(403);
		}
	});

	it("does not throw when user has event permission", async () => {
		setQueryResult([{ user_id: 1, event_id: 10, role: "GUEST" }]);
		await expect(
			needsEventPermission(1, 10, Event.VIEW),
		).resolves.toBeUndefined();
	});
});

describe("hasLocationPermission", () => {
	it("returns false for VIEW when no invitation", async () => {
		setQueryResult([]);
		expect(await hasLocationPermission(1, 5, Location.VIEW)).toBe(false);
	});

	it("returns true for VIEW when invitation found", async () => {
		setQueryResult([{ event_id: 10 }]);
		expect(await hasLocationPermission(1, 5, Location.VIEW)).toBe(true);
	});

	it("returns false for EDIT_ALL when not creator and no admin", async () => {
		setQueryResult([]);
		expect(await hasLocationPermission(1, 5, Location.EDIT_ALL)).toBe(false);
	});

	it("returns true for EDIT_ALL when creator row returned", async () => {
		setQueryResult([{ id: 5, creator_user: 1 }]);
		expect(await hasLocationPermission(1, 5, Location.EDIT_ALL)).toBe(true);
	});
});

describe("needsLocationPermission", () => {
	it("throws 403 when user lacks location permission", async () => {
		setQueryResult([]);
		try {
			await needsLocationPermission(1, 5, Location.VIEW);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(403);
		}
	});
});

describe("needsSelfOrAdmin", () => {
	it("does not throw when requester is the target user", async () => {
		await expect(needsSelfOrAdmin(1, 1)).resolves.toBeUndefined();
	});

	it("throws 403 when requester is not target and not admin", async () => {
		setQueryResult([]);
		try {
			await needsSelfOrAdmin(1, 2);
			expect(true).toBe(false);
		} catch (e) {
			expect((e as AppError).status).toBe(403);
		}
	});

	it("does not throw when requester is admin (has USER_ADMIN)", async () => {
		setQueryResult([{ user_id: 1, permission: "USER_ADMIN" }]);
		await expect(needsSelfOrAdmin(1, 2)).resolves.toBeUndefined();
	});
});
