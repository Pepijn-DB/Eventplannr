export async function hash(
	value: unknown,
	opts: { algorithm?: "SHA-256" | "SHA-384" | "SHA-512" } = {},
): Promise<string> {
	const algorithm = opts.algorithm ?? "SHA-256";
	const canonical = canonicalize(value);
	const bytes = new TextEncoder().encode(canonical);
	const digest = await crypto.subtle.digest(algorithm, bytes);
	return toHex(digest);
}

function toHex(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let out = "";
	for (const b of bytes) out += b.toString(16).padStart(2, "0");
	return out;
}

function canonicalize(value: unknown): string {
	return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
	if (value === null || value === undefined) return null;

	const t = typeof value;

	if (t === "string" || t === "number" || t === "boolean") return value;

	if (t === "bigint") return { $type: "bigint", value: value.toString() };

	if (t === "undefined") return { $type: "undefined" };

	if (t === "function" || t === "symbol") {
		throw new TypeError(`Unsupported type for hashing: ${t}`);
	}

	// object
	if (value instanceof Date) {
		return { $type: "date", value: value.toISOString() };
	}

	if (Array.isArray(value)) {
		return value.map(normalize);
	}

	// Only support plain objects
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) {
		throw new TypeError("Only plain objects are supported for hashing");
	}

	const obj = value as Record<string, unknown>;
	const keys = Object.keys(obj).sort();

	const out: Record<string, unknown> = {};
	for (const k of keys) out[k] = normalize(obj[k]);
	return out;
}

export default hash;
