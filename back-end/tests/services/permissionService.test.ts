/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { beforeEach, describe, expect, it, vi } from "vitest";
import database from "../../src/services/databaseService.js";
import * as permissionService from "../../src/services/permissionService.js";

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
import { Event, Global, Location } from "../../src/models/permissions.js";

describe("permissionService", () => {
	beforeEach(() => {
		(database.query as any).mockReset();
	});

	it("hasGlobalPermission ADMIN_ALL returns true when user_permissions exists", async () => {
		(database.query as any).mockResolvedValueOnce({
			rows: [{ user_id: 1, permission: "GLOBAL_ADMIN" }],
		});
		const res = await permissionService.hasGlobalPermission(
			1,
			Global.ADMIN_ALL,
			1,
		);
		expect(res).toBe(true);
		expect(database.query).toHaveBeenCalledWith(
			expect.stringContaining("user_permissions") &&
				expect.stringContaining("GLOBAL_ADMIN"),
			[1],
			1,
		);
	});

	it("hasEventPermission VIEW returns true when invitation exists", async () => {
		(database.query as any).mockResolvedValueOnce({
			rows: [{ user_id: 2, event_id: 5, role: "X" }],
		});
		const res = await permissionService.hasEventPermission(2, 5, Event.VIEW, 2);
		expect(res).toBe(true);
		expect(database.query).toHaveBeenCalledWith(
			expect.stringContaining("invitation"),
			[2, 5],
			2,
		);
	});

	it("hasLocationPermission VIEW returns false when no rows", async () => {
		(database.query as any).mockResolvedValue({ rows: [] });
		const res = await permissionService.hasLocationPermission(
			1,
			10,
			Location.VIEW,
			1,
		);
		expect(res).toBe(false);
		expect(database.query).toHaveBeenCalledWith(
			expect.stringContaining("invitation") &&
				expect.stringContaining("event_locations"),
			[1, 10],
			1,
		);
	});
});
