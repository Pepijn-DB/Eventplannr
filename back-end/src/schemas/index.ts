import { z } from "zod";

const eventStatus = z.enum(["OPEN", "CLOSED", "CANCELLED", "DRAFT"]);

export const authTokenSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export const createUserSchema = z.object({
	username: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(1),
});

export const updateUserSchema = z
	.object({
		username: z.string().min(1).optional(),
		email: z.string().email().optional(),
		password: z.string().min(1).optional(),
	})
	.refine((d) => d.username || d.email || d.password, {
		message: "Nothing to update",
	});

export const updateFullUserSchema = z.object({
	username: z.string().min(1),
	email: z.string().email(),
	password: z.string().min(1),
});

export const createUserPermissionSchema = z.object({
	permission: z.string().min(1),
});

export const createEventSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
});

export const updateEventSchema = z
	.object({
		title: z.string().min(1).optional(),
		description: z.string().optional(),
		status: eventStatus.optional(),
	})
	.refine((d) => d.title || d.description || d.status, {
		message: "Nothing to update",
	});

export const updateFullEventSchema = z.object({
	title: z.string().min(1),
	description: z.string(),
	status: eventStatus,
});

export const createInvitationSchema = z.object({
	userId: z.number().int().positive(),
	role: z.string().min(1).optional(),
});

export const updateInvitationSchema = z.object({
	role: z.string().min(1),
});

export const createEventLocationSchema = z.object({
	location_id: z.number().int().positive(),
});

export const createLocationSchema = z.object({
	name: z.string().min(1),
});

export const updateLocationSchema = z.object({
	name: z.string().min(1),
});

export const createEventDateSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.refine((s) => {
			const d = new Date(`${s}T00:00:00Z`);
			return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
		}, {
			message: "Invalid date",
		}),
});

export const responseStateSchema = z.object({
	state: z.string().min(1),
});
