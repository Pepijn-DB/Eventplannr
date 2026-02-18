import type { RowDataPacket } from "mysql2";

export type _result =
	| users
	| user_permissions
	| events
	| event_dates
	| invitation
	| locations
	| date_response
	| location_response
	| log;

export interface users extends RowDataPacket {
	id: number;
	username: string;
	password_hash: string;
	email: string;
	created_at: Date;
	updated_log: number;
}

export interface user_permissions extends RowDataPacket {
	id: number;
	user_id: number;
	permission: Permissions;
	enabled: boolean;
	created_at: Date;
	updated_log: number;
}

export interface events extends RowDataPacket {
	id: number;
	title: string;
	description: string;
	creator_user: number;
	created_at: Date;
	updated_log: number;
	status: Status;
}

export interface event_dates extends RowDataPacket {
	id: number;
	event_id: number;
	date: Date;
	created_at: Date;
	updated_log: number;
}

export interface invitation extends RowDataPacket {
	id: number;
	user_id: number;
	event_id: number;
	created_at: Date;
	updated_log: number;
	role: Role;
}

export interface locations extends RowDataPacket {
	id: number;
	name: string;
	creator_user: number;
	created_at: Date;
	updated_log: number;
}

export interface date_response extends RowDataPacket {
	id: number;
	invitation_id: number;
	date_id: number;
	state: State;
	created_at: Date;
	updated_log: number;
}

export interface location_response extends RowDataPacket {
	id: number;
	invitation_id: number;
	location_id: number;
	state: State;
	created_at: Date;
	updated_log: number;
}

export interface log extends RowDataPacket {
	id: number;
	table_name: string;
	where_clause: string;
	action: string;
	created_at: Date;
	query: string;
	executioner_id: number;
}

export enum Permissions {
	_USER,
	_GLOBAL_ADMIN,
	_USER_ADMIN,
	_EVENT_ADMIN,
}

export enum State {
	_YES,
	_NO,
	_MAYBE,
	_QUESTION,
	_NO_RESPONSE,
}

export enum Status {
	DRAFT,
	OPEN,
	CLOSED,
	CANCELLED,
}

export enum Role {
	GUEST,
	_DATE_PICKER,
	_LOCATION_PICKER,
	_ORGANIZER,
}
