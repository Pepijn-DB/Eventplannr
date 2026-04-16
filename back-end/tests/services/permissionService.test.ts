/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { beforeEach, describe, expect, it, vi } from "vitest";
import database from "../../src/services/databaseService.js";

vi.mock("../../src/services/databaseService.js", () => {
	const query = vi.fn();
	const prepareQueryAndParams = vi.fn();
	const parseQuery = vi.fn();
	const queryWithoutExecutioner = vi.fn();
	const convertQuestionMarksToDollarParams = vi.fn();
	return {
		default: {
			query,
			prepareQueryAndParams,
			parseQuery,
			queryWithoutExecutioner,
			convertQuestionMarksToDollarParams,
			connect: vi.fn(),
			close: vi.fn(),
		},
		query,
		prepareQueryAndParams,
		parseQuery,
		queryWithoutExecutioner,
		convertQuestionMarksToDollarParams,
	};
});

// import enums for permissions
import {
	Event,
	EventMeta,
	Global,
	GlobalMeta,
	Location,
	LocationMeta,
} from "../../src/models/permissions.js";
import {
	hasEventPermission,
	hasGlobalPermission,
	hasLocationPermission,
} from "../../src/services/permissionService.js";

async function testPermission(
	succeeds: boolean,
	checkPermission: Event | Location | Global,
	hasPermission?: Event | Location | Global,
): Promise<void> {
	function isEnumValue<T extends object>(
		enumObj: T,
		value: unknown,
	): value is T[keyof T] {
		// for numeric enums we require a number and check membership among enum values
		return (
			typeof value === "number" &&
			Object.values(enumObj as any).includes(value as any)
		);
	}

	if (
		hasPermission !== undefined &&
		isEnumValue(Global, hasPermission) &&
		GlobalMeta[hasPermission].sql !== undefined &&
		GlobalMeta[hasPermission].sql !== null
	) {
		(database.query as any).mockResolvedValue({
			rows: [{ user_id: 1, permission: GlobalMeta[hasPermission].sql }],
		});
	} else if (
		succeeds &&
		hasPermission !== undefined &&
		isEnumValue(Global, hasPermission) &&
		(GlobalMeta[hasPermission].sql === undefined ||
			GlobalMeta[hasPermission].sql === null)
	) {
		(database.query as any).mockResolvedValue({
			rows: [{ user_id: 1, permission: GlobalMeta[Global.ADMIN_ALL].sql }],
		});
	} else if (
		succeeds &&
		isEnumValue(Event, checkPermission) &&
		GlobalMeta[checkPermission].sql !== undefined &&
		GlobalMeta[checkPermission].sql !== null
	) {
		(database.query as any).mockResolvedValue({
			rows: [{ user_id: 1, permission: GlobalMeta[checkPermission].sql }],
		});
	} else if (succeeds) {
		(database.query as any).mockResolvedValue({
			rows: [{ user_id: 1, permission: GlobalMeta[Global.ADMIN_ALL].sql }],
		});
	}

	let result: boolean | undefined;
	if (isEnumValue(Event, checkPermission)) {
		result = await hasEventPermission(1, 1, checkPermission, 1);
	} else if (isEnumValue(Location, checkPermission)) {
		result = await hasLocationPermission(1, 1, checkPermission, 1);
	} else if (isEnumValue(Global, checkPermission)) {
		result = await hasGlobalPermission(1, checkPermission);
	}

	expect(result).toBe(succeeds);
}

describe("permissionService", () => {
	beforeEach(() => {
		(database.query as any).mockReset();
	});

	for (const permission of Object.values(Global)) {
		if (typeof permission !== "string") {
			it(`hasGlobalPermission ${GlobalMeta[permission].string} returns true when user has that permission exists`, async () => {
				await testPermission(true, permission);
			});
		}
	}

	for (const permission of Object.values(Event)) {
		if (typeof permission !== "string") {
			it(`hasEventPermission ${EventMeta[permission].string} returns true when user has that permission exists`, async () => {
				await testPermission(true, permission);
			});
		}
	}

	for (const permission of Object.values(Location)) {
		if (typeof permission !== "string") {
			it(`hasLocationPermission ${LocationMeta[permission].string} returns true when user has that permission exists`, async () => {
				await testPermission(true, permission);
			});
		}
	}

	it("hasEventPermission VIEW returns true when invitation exists", async () => {
		(database.query as any).mockResolvedValueOnce({
			rows: [{ user_id: 2, event_id: 1, role: "X" }],
		});
		await testPermission(true, Event.VIEW);
	});

	it("hasLocationPermission VIEW returns false when no rows", async () => {
		(database.query as any).mockResolvedValue({ rows: [] });
		await testPermission(false, Location.VIEW);
	});
});
