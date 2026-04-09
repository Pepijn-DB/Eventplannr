export enum Global {
	ACCESS_APP,
	VIEW_ALL_USERS,
	VIEW_ALL_EVENTS,
	VIEW_ALL_INVITATIONS,
	VIEW_ALL_LOCATIONS,
	VIEW_ALL_PERMISSIONS,
	VIEW_ALL_RESPONSES,
	VIEW_LOG,
	EDIT_ALL_USERS,
	EDIT_ALL_EVENTS,
	EDIT_ALL_INVITATIONS,
	EDIT_ALL_LOCATIONS,
	EDIT_ALL_PERMISSIONS,
	EDIT_ALL_RESPONSES,
	ADMIN_EVENT,
	ADMIN_LOCATION,
	ADMIN_USER,
	ADMIN_ALL,
}

export const GlobalMeta: Record<Global, { sql: string | null }> = {
	[Global.ACCESS_APP]: { sql: null },
	[Global.VIEW_ALL_USERS]: { sql: null },
	[Global.VIEW_ALL_EVENTS]: { sql: null },
	[Global.VIEW_ALL_INVITATIONS]: { sql: null },
	[Global.VIEW_ALL_LOCATIONS]: { sql: null },
	[Global.VIEW_ALL_PERMISSIONS]: { sql: null },
	[Global.VIEW_ALL_RESPONSES]: { sql: null },
	[Global.VIEW_LOG]: { sql: null },
	[Global.EDIT_ALL_USERS]: { sql: null },
	[Global.EDIT_ALL_EVENTS]: { sql: null },
	[Global.EDIT_ALL_INVITATIONS]: { sql: null },
	[Global.EDIT_ALL_LOCATIONS]: { sql: null },
	[Global.EDIT_ALL_PERMISSIONS]: { sql: null },
	[Global.EDIT_ALL_RESPONSES]: { sql: null },
	[Global.ADMIN_EVENT]: { sql: "EVENT_ADMIN" },
	[Global.ADMIN_LOCATION]: { sql: null },
	[Global.ADMIN_USER]: { sql: "USER_ADMIN" },
	[Global.ADMIN_ALL]: { sql: "GLOBAL_ADMIN" },
};

export enum Event {
	VIEW,
	EDIT_DATE,
	EDIT_LOCATION,
	EDIT_INVITATION,
	EDIT_DETAILS,
	EDIT_ALL,
}

export enum Location {
	VIEW,
	EDIT_ALL,
}

export default { Global, Event };
