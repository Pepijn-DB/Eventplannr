import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: "3.0.3",
		info: {
			title: "Eventplannr API",
			version: "1.0.0",
			description: "REST API for the Eventplannr application",
		},
		servers: [{ url: "/api/v1", description: "V1" }],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
				},
			},
			responses: {
				Unauthorized: {
					description: "Unauthorized – missing or invalid JWT",
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/Error" },
						},
					},
				},
				Forbidden: {
					description: "Forbidden – insufficient permissions",
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/Error" },
						},
					},
				},
			},
			schemas: {
				Pagination: {
					type: "object",
					properties: {
						total: { type: "integer" },
						page: { type: "integer" },
						per_page: { type: "integer" },
						offset: { type: "integer" },
					},
				},
				User: {
					type: "object",
					properties: {
						id: { type: "integer" },
						username: { type: "string" },
						email: { type: "string", format: "email" },
					},
				},
				UserPermission: {
					type: "object",
					properties: {
						id: { type: "integer" },
						user_id: { type: "integer" },
						permission: {
							type: "string",
							enum: ["USER", "GLOBAL_ADMIN", "USER_ADMIN", "EVENT_ADMIN"],
						},
					},
				},
				Event: {
					type: "object",
					properties: {
						id: { type: "integer" },
						title: { type: "string" },
						description: { type: "string", nullable: true },
						creator_user: { type: "integer" },
						status: {
							type: "string",
							enum: ["OPEN", "CLOSED", "CANCELLED", "DRAFT"],
						},
					},
				},
				Invitation: {
					type: "object",
					properties: {
						id: { type: "integer" },
						event_id: { type: "integer" },
						user_id: { type: "integer" },
						role: {
							type: "string",
							enum: ["GUEST", "DATE_PICKER", "LOCATION_PICKER", "ORGANIZER"],
						},
					},
				},
				Location: {
					type: "object",
					properties: {
						id: { type: "integer" },
						name: { type: "string" },
						creator_user: { type: "integer" },
					},
				},
				EventLocation: {
					type: "object",
					properties: {
						id: { type: "integer" },
						event_id: { type: "integer" },
						location_id: { type: "integer" },
					},
				},
				EventDate: {
					type: "object",
					properties: {
						id: { type: "integer" },
						event_id: { type: "integer" },
						date: { type: "string", format: "date", example: "2025-12-31" },
					},
				},
				DateResponse: {
					type: "object",
					properties: {
						event_id: { type: "integer" },
						date_id: { type: "integer" },
						user_id: { type: "integer" },
						state: {
							type: "string",
							enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
						},
					},
				},
				LocationResponse: {
					type: "object",
					properties: {
						event_id: { type: "integer" },
						location_id: { type: "integer" },
						user_id: { type: "integer" },
						state: {
							type: "string",
							enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
						},
					},
				},
				Error: {
					type: "object",
					properties: {
						message: { type: "string" },
					},
				},
			},
		},
		security: [{ bearerAuth: [] }],
		paths: {
			// ── Auth ──────────────────────────────────────────────────────────
			"/auth/token": {
				post: {
					tags: ["Auth"],
					summary: "Get JWT token",
					security: [],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["email", "password"],
									properties: {
										email: { type: "string", format: "email" },
										password: { type: "string", minLength: 1 },
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "JWT token",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: { token: { type: "string" } },
									},
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": {
							description: "Invalid credentials",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Users ─────────────────────────────────────────────────────────
			"/user": {
				get: {
					tags: ["Users"],
					summary: "List users",
					parameters: [
						{ in: "query", name: "username", schema: { type: "string" } },
						{ in: "query", name: "email", schema: { type: "string" } },
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of users",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: { $ref: "#/components/schemas/User" },
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
				post: {
					tags: ["Users"],
					summary: "Create user",
					security: [],
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["username", "email", "password"],
									properties: {
										username: { type: "string", minLength: 1 },
										email: { type: "string", format: "email" },
										password: { type: "string", minLength: 1 },
									},
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created user",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/User" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"409": {
							description: "Email already in use",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/user/{id}": {
				parameters: [
					{
						in: "path",
						name: "id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Users"],
					summary: "Get user by ID",
					responses: {
						"200": {
							description: "User",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/User" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Users"],
					summary: "Partial update user",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										username: { type: "string", minLength: 1 },
										email: { type: "string", format: "email" },
										password: { type: "string", minLength: 1 },
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated user",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/User" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Users"],
					summary: "Full update user",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["username", "email", "password"],
									properties: {
										username: { type: "string", minLength: 1 },
										email: { type: "string", format: "email" },
										password: { type: "string", minLength: 1 },
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated user",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/User" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Users"],
					summary: "Delete user",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/user/{id}/invitations": {
				parameters: [
					{
						in: "path",
						name: "id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Users"],
					summary: "Get user's event invitations",
					parameters: [
						{
							in: "query",
							name: "role",
							schema: {
								type: "string",
								enum: ["GUEST", "DATE_PICKER", "LOCATION_PICKER", "ORGANIZER"],
							},
						},
						{ in: "query", name: "event_id", schema: { type: "integer" } },
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of invitations",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: { $ref: "#/components/schemas/Invitation" },
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/user/{id}/permissions": {
				parameters: [
					{
						in: "path",
						name: "id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Users"],
					summary: "Get user permissions",
					responses: {
						"200": {
							description: "List of permissions",
							content: {
								"application/json": {
									schema: {
										type: "array",
										items: { $ref: "#/components/schemas/UserPermission" },
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				post: {
					tags: ["Users"],
					summary: "Create user permission",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["permission"],
									properties: {
										permission: {
											type: "string",
											enum: [
												"USER",
												"GLOBAL_ADMIN",
												"USER_ADMIN",
												"EVENT_ADMIN",
											],
										},
									},
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created permission",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/UserPermission" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "User not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Users"],
					summary: "Partial update user permission",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["permission"],
									properties: {
										permission: {
											type: "string",
											enum: [
												"USER",
												"GLOBAL_ADMIN",
												"USER_ADMIN",
												"EVENT_ADMIN",
											],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated permission",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/UserPermission" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Users"],
					summary: "Full update user permission",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["permission"],
									properties: {
										permission: {
											type: "string",
											enum: [
												"USER",
												"GLOBAL_ADMIN",
												"USER_ADMIN",
												"EVENT_ADMIN",
											],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated permission",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/UserPermission" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Users"],
					summary: "Delete user permission",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Events ────────────────────────────────────────────────────────
			"/event": {
				get: {
					tags: ["Events"],
					summary: "List events",
					parameters: [
						{ in: "query", name: "title", schema: { type: "string" } },
						{
							in: "query",
							name: "status",
							schema: {
								type: "string",
								enum: ["OPEN", "CLOSED", "CANCELLED", "DRAFT"],
							},
						},
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of events",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: { $ref: "#/components/schemas/Event" },
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
				post: {
					tags: ["Events"],
					summary: "Create event",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["title"],
									properties: {
										title: { type: "string", minLength: 1 },
										description: { type: "string" },
									},
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created event",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Event" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
			},
			"/event/{event_id}": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Events"],
					summary: "Get event by ID",
					responses: {
						"200": {
							description: "Event",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Event" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Events"],
					summary: "Partial update event",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										title: { type: "string", minLength: 1 },
										description: { type: "string" },
										status: {
											type: "string",
											enum: ["OPEN", "CLOSED", "CANCELLED", "DRAFT"],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated event",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Event" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Events"],
					summary: "Full update event",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["title", "description", "status"],
									properties: {
										title: { type: "string", minLength: 1 },
										description: { type: "string" },
										status: {
											type: "string",
											enum: ["OPEN", "CLOSED", "CANCELLED", "DRAFT"],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated event",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Event" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Events"],
					summary: "Delete event",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Event Invitations ─────────────────────────────────────────────
			"/event/{event_id}/invitation": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Event Invitations"],
					summary: "List event invitations",
					parameters: [
						{
							in: "query",
							name: "role",
							schema: {
								type: "string",
								enum: ["GUEST", "DATE_PICKER", "LOCATION_PICKER", "ORGANIZER"],
							},
						},
						{ in: "query", name: "user_id", schema: { type: "integer" } },
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of invitations",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: { $ref: "#/components/schemas/Invitation" },
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Event not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				post: {
					tags: ["Event Invitations"],
					summary: "Create invitation",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["userId"],
									properties: {
										userId: { type: "integer" },
										role: {
											type: "string",
											enum: [
												"GUEST",
												"DATE_PICKER",
												"LOCATION_PICKER",
												"ORGANIZER",
											],
										},
									},
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created invitation",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Invitation" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/event/{event_id}/invitation/{invitation_id}": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "invitation_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Event Invitations"],
					summary: "Get invitation by ID",
					responses: {
						"200": {
							description: "Invitation",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Invitation" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Event Invitations"],
					summary: "Partial update invitation",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["role"],
									properties: {
										role: {
											type: "string",
											enum: [
												"GUEST",
												"DATE_PICKER",
												"LOCATION_PICKER",
												"ORGANIZER",
											],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated invitation",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Invitation" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Event Invitations"],
					summary: "Full update invitation",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["role"],
									properties: {
										role: {
											type: "string",
											enum: [
												"GUEST",
												"DATE_PICKER",
												"LOCATION_PICKER",
												"ORGANIZER",
											],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated invitation",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Invitation" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Event Invitations"],
					summary: "Delete invitation",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Event Locations ───────────────────────────────────────────────
			"/event/{event_id}/location": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Event Locations"],
					summary: "List event locations",
					parameters: [
						{ in: "query", name: "name", schema: { type: "string" } },
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of event locations",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: {
															$ref: "#/components/schemas/EventLocation",
														},
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
				post: {
					tags: ["Event Locations"],
					summary: "Add location to event",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["location_id"],
									properties: { location_id: { type: "integer" } },
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created event location",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/EventLocation" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/event/{event_id}/location/{location_id}": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "location_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Event Locations"],
					summary: "Get event location by ID",
					responses: {
						"200": {
							description: "Event location",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/EventLocation" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Event Locations"],
					summary: "Partial update event location",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["location_id"],
									properties: { location_id: { type: "integer" } },
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated event location",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/EventLocation" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Event Locations"],
					summary: "Full update event location",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["location_id"],
									properties: { location_id: { type: "integer" } },
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated event location",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/EventLocation" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Event Locations"],
					summary: "Remove location from event",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Event Dates ───────────────────────────────────────────────────
			"/event/{event_id}/date": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Event Dates"],
					summary: "List event dates",
					parameters: [
						{
							in: "query",
							name: "from",
							schema: { type: "string", format: "date" },
						},
						{
							in: "query",
							name: "to",
							schema: { type: "string", format: "date" },
						},
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of event dates",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: { $ref: "#/components/schemas/EventDate" },
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
				post: {
					tags: ["Event Dates"],
					summary: "Add date to event",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["date"],
									properties: {
										date: {
											type: "string",
											format: "date",
											example: "2025-12-31",
										},
									},
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created event date",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/EventDate" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/event/{event_id}/date/{date_id}": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "date_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Event Dates"],
					summary: "Get event date by ID",
					responses: {
						"200": {
							description: "Event date",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/EventDate" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Event Dates"],
					summary: "Partial update event date",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["date"],
									properties: {
										date: {
											type: "string",
											format: "date",
											example: "2025-12-31",
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated event date",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/EventDate" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Event Dates"],
					summary: "Full update event date",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["date"],
									properties: {
										date: {
											type: "string",
											format: "date",
											example: "2025-12-31",
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated event date",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/EventDate" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Event Dates"],
					summary: "Remove date from event",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Locations ─────────────────────────────────────────────────────
			"/location": {
				get: {
					tags: ["Locations"],
					summary: "List locations",
					parameters: [
						{ in: "query", name: "name", schema: { type: "string" } },
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of locations",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: { $ref: "#/components/schemas/Location" },
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
				post: {
					tags: ["Locations"],
					summary: "Create location",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["name"],
									properties: { name: { type: "string", minLength: 1 } },
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created location",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Location" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
			},
			"/location/{location_id}": {
				parameters: [
					{
						in: "path",
						name: "location_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Locations"],
					summary: "Get location by ID",
					responses: {
						"200": {
							description: "Location",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Location" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Locations"],
					summary: "Partial update location",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["name"],
									properties: { name: { type: "string", minLength: 1 } },
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated location",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Location" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Locations"],
					summary: "Full update location",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["name"],
									properties: { name: { type: "string", minLength: 1 } },
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated location",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Location" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Locations"],
					summary: "Delete location",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Responses – Date ──────────────────────────────────────────────
			"/response/{event_id}/date": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Responses"],
					summary: "List date responses for event",
					parameters: [
						{
							in: "query",
							name: "state",
							schema: {
								type: "string",
								enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
							},
						},
						{ in: "query", name: "user_id", schema: { type: "integer" } },
						{ in: "query", name: "date_id", schema: { type: "integer" } },
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of date responses",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: {
															$ref: "#/components/schemas/DateResponse",
														},
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
			},
			"/response/{event_id}/date/{date_id}": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "date_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				post: {
					tags: ["Responses"],
					summary: "Submit date response",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["state"],
									properties: {
										state: {
											type: "string",
											enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
										},
									},
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created date response",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/DateResponse" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/response/{event_id}/date/{date_id}/{user_id}": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "date_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "user_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Responses"],
					summary: "Get specific date response",
					responses: {
						"200": {
							description: "Date response",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/DateResponse" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Responses"],
					summary: "Partial update date response",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["state"],
									properties: {
										state: {
											type: "string",
											enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated date response",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/DateResponse" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Responses"],
					summary: "Full update date response",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["state"],
									properties: {
										state: {
											type: "string",
											enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated date response",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/DateResponse" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Responses"],
					summary: "Delete date response",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Responses – Location ──────────────────────────────────────────
			"/response/{event_id}/location": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Responses"],
					summary: "List location responses for event",
					parameters: [
						{
							in: "query",
							name: "state",
							schema: {
								type: "string",
								enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
							},
						},
						{ in: "query", name: "user_id", schema: { type: "integer" } },
						{ in: "query", name: "location_id", schema: { type: "integer" } },
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "Paginated list of location responses",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: {
															$ref: "#/components/schemas/LocationResponse",
														},
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
					},
				},
			},
			"/response/{event_id}/location/{location_id}": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "location_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				post: {
					tags: ["Responses"],
					summary: "Submit location response",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["state"],
									properties: {
										state: {
											type: "string",
											enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
										},
									},
								},
							},
						},
					},
					responses: {
						"201": {
							description: "Created location response",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/LocationResponse" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/response/{event_id}/location/{location_id}/{user_id}": {
				parameters: [
					{
						in: "path",
						name: "event_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "location_id",
						required: true,
						schema: { type: "integer" },
					},
					{
						in: "path",
						name: "user_id",
						required: true,
						schema: { type: "integer" },
					},
				],
				get: {
					tags: ["Responses"],
					summary: "Get specific location response",
					responses: {
						"200": {
							description: "Location response",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/LocationResponse" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				patch: {
					tags: ["Responses"],
					summary: "Partial update location response",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["state"],
									properties: {
										state: {
											type: "string",
											enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated location response",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/LocationResponse" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				put: {
					tags: ["Responses"],
					summary: "Full update location response",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["state"],
									properties: {
										state: {
											type: "string",
											enum: ["YES", "NO", "MAYBE", "QUESTION", "NO_RESPONSE"],
										},
									},
								},
							},
						},
					},
					responses: {
						"200": {
							description: "Updated location response",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/LocationResponse" },
								},
							},
						},
						"400": {
							description: "Validation error",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
				delete: {
					tags: ["Responses"],
					summary: "Delete location response",
					responses: {
						"204": { description: "Deleted" },
						"401": { $ref: "#/components/responses/Unauthorized" },
						"404": {
							description: "Not found",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},

			// ── Admin ─────────────────────────────────────────────────────────
			"/admin/logs": {
				get: {
					tags: ["Admin"],
					summary: "Get system logs",
					parameters: [
						{ in: "query", name: "page", schema: { type: "integer" } },
						{ in: "query", name: "per_page", schema: { type: "integer" } },
					],
					responses: {
						"200": {
							description: "System logs",
							content: {
								"application/json": {
									schema: {
										allOf: [
											{ $ref: "#/components/schemas/Pagination" },
											{
												type: "object",
												properties: {
													data: {
														type: "array",
														items: {
															type: "object",
															properties: {
																id: { type: "integer" },
																timestamp: {
																	type: "string",
																	format: "date-time",
																},
																level: { type: "string" },
																message: { type: "string" },
															},
														},
													},
												},
											},
										],
									},
								},
							},
						},
						"401": { $ref: "#/components/responses/Unauthorized" },
						"403": { $ref: "#/components/responses/Forbidden" },
					},
				},
			},
		},
	},
	apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
