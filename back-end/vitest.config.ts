import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		passWithNoTests: false,
		coverage: {
			provider: "v8",
		},
		include: ["tests/**/*.test.ts"],
	},
});
