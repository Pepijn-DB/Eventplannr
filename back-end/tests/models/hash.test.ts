import { describe, expect, it } from "bun:test";
import hash from "../../src/models/hash.js";

describe("hash", () => {
	it("returns a hex string for a simple string", async () => {
		const result = await hash("hello");
		expect(typeof result).toBe("string");
		expect(result).toMatch(/^[0-9a-f]+$/);
	});

	it("is deterministic", async () => {
		const a = await hash("hello");
		const b = await hash("hello");
		expect(a).toBe(b);
	});

	it("produces different hashes for different inputs", async () => {
		const a = await hash("hello");
		const b = await hash("world");
		expect(a).not.toBe(b);
	});

	it("hashes numbers", async () => {
		const result = await hash(42);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});

	it("hashes booleans", async () => {
		const t = await hash(true);
		const f = await hash(false);
		expect(t).not.toBe(f);
	});

	it("hashes null and undefined to the same value", async () => {
		const n = await hash(null);
		const u = await hash(undefined);
		expect(n).toBe(u);
	});

	it("hashes plain objects with sorted keys", async () => {
		const a = await hash({ b: 1, a: 2 });
		const b = await hash({ a: 2, b: 1 });
		expect(a).toBe(b);
	});

	it("hashes arrays", async () => {
		const result = await hash([1, 2, 3]);
		expect(typeof result).toBe("string");
	});

	it("distinguishes arrays with different order", async () => {
		const a = await hash([1, 2, 3]);
		const b = await hash([3, 2, 1]);
		expect(a).not.toBe(b);
	});

	it("hashes Date objects", async () => {
		const d = new Date("2024-01-01T00:00:00.000Z");
		const result = await hash(d);
		expect(typeof result).toBe("string");
	});

	it("hashes bigints", async () => {
		const result = await hash(BigInt(123));
		expect(typeof result).toBe("string");
	});

	it("supports SHA-384 algorithm", async () => {
		const result = await hash("hello", { algorithm: "SHA-384" });
		expect(result).toMatch(/^[0-9a-f]+$/);
		expect(result.length).toBe(96);
	});

	it("supports SHA-512 algorithm", async () => {
		const result = await hash("hello", { algorithm: "SHA-512" });
		expect(result).toMatch(/^[0-9a-f]+$/);
		expect(result.length).toBe(128);
	});

	it("SHA-256 produces 64 char hex string", async () => {
		const result = await hash("hello", { algorithm: "SHA-256" });
		expect(result.length).toBe(64);
	});

	it("throws on function values", async () => {
		await expect(hash(() => {})).rejects.toThrow("Unsupported type");
	});

	it("throws on symbol values", async () => {
		await expect(hash(Symbol("x"))).rejects.toThrow("Unsupported type");
	});

	it("throws on non-plain objects", async () => {
		class Foo {}
		await expect(hash(new Foo())).rejects.toThrow("Only plain objects");
	});

	it("hashes nested plain objects", async () => {
		const result = await hash({ a: { b: { c: 1 } } });
		expect(typeof result).toBe("string");
	});
});
