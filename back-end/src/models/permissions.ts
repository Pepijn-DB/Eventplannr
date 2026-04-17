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

export const GlobalMeta: Record<
	Global,
	{ sql: string | null; string: string }
> = {
	[Global.ACCESS_APP]: { sql: null, string: "Global.ACCESS_APP" },
	[Global.VIEW_ALL_USERS]: { sql: null, string: "Global.VIEW_ALL_USERS" },
	[Global.VIEW_ALL_EVENTS]: { sql: null, string: "Global.VIEW_ALL_EVENTS" },
	[Global.VIEW_ALL_INVITATIONS]: {
		sql: null,
		string: "Global.VIEW_ALL_INVITATIONS",
	},
	[Global.VIEW_ALL_LOCATIONS]: {
		sql: null,
		string: "Global.VIEW_ALL_LOCATIONS",
	},
	[Global.VIEW_ALL_PERMISSIONS]: {
		sql: null,
		string: "Global.VIEW_ALL_PERMISSIONS",
	},
	[Global.VIEW_ALL_RESPONSES]: {
		sql: null,
		string: "Global.VIEW_ALL_RESPONSES",
	},
	[Global.VIEW_LOG]: { sql: null, string: "Global.VIEW_LOG" },
	[Global.EDIT_ALL_USERS]: { sql: null, string: "Global.EDIT_ALL_USERS" },
	[Global.EDIT_ALL_EVENTS]: { sql: null, string: "Global.EDIT_ALL_EVENTS" },
	[Global.EDIT_ALL_INVITATIONS]: {
		sql: null,
		string: "Global.EDIT_ALL_INVITATIONS",
	},
	[Global.EDIT_ALL_LOCATIONS]: {
		sql: null,
		string: "Global.EDIT_ALL_LOCATIONS",
	},
	[Global.EDIT_ALL_PERMISSIONS]: {
		sql: null,
		string: "Global.EDIT_ALL_PERMISSIONS",
	},
	[Global.EDIT_ALL_RESPONSES]: {
		sql: null,
		string: "Global.EDIT_ALL_RESPONSES",
	},
	[Global.ADMIN_EVENT]: { sql: "EVENT_ADMIN", string: "Global.ADMIN_EVENT" },
	[Global.ADMIN_LOCATION]: { sql: null, string: "Global.ADMIN_LOCATION" },
	[Global.ADMIN_USER]: { sql: "USER_ADMIN", string: "Global.ADMIN_USER" },
	[Global.ADMIN_ALL]: { sql: "GLOBAL_ADMIN", string: "Global.ADMIN_ALL" },
};

export enum Event {
	VIEW,
	EDIT_DATE,
	EDIT_LOCATION,
	EDIT_INVITATION,
	EDIT_DETAILS,
	EDIT_ALL,
}

export const EventMeta: Record<Event, { sql: string | null; string: string }> =
	{
		[Event.VIEW]: { sql: null, string: "Event.VIEW" },
		[Event.EDIT_DATE]: { sql: null, string: "Event.EDIT_DATE" },
		[Event.EDIT_LOCATION]: { sql: null, string: "Event.EDIT_LOCATION" },
		[Event.EDIT_INVITATION]: { sql: null, string: "Event.EDIT_INVITATION" },
		[Event.EDIT_DETAILS]: { sql: null, string: "Event.EDIT_DETAILS" },
		[Event.EDIT_ALL]: { sql: null, string: "Event.EDIT_ALL" },
	};

export enum Location {
	VIEW,
	EDIT_ALL,
}

export const LocationMeta: Record<
	Location,
	{ sql: string | null; string: string }
> = {
	[Location.VIEW]: { sql: null, string: "Location.VIEW" },
	[Location.EDIT_ALL]: { sql: null, string: "Location.EDIT_ALL" },
};

export default { Global, Event };
