export function variableValidator<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

// biome-ignore lint/suspicious/noExplicitAny: <Checks variables, and the variables need to be any to ensure all variables can be checked>
export function arrayValidator(value: any[]): boolean {
	if (!Array.isArray(value)) return false;
	for (const element of value) {
		if (!variableValidator(element)) return false;
	}
	return true;
}
