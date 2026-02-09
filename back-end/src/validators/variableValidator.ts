// biome-ignore lint/suspicious/noExplicitAny: <Checks a variable, and the variable need to be any to ensure all variables can be checked>
export function variableValidator(value: any): boolean {
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
