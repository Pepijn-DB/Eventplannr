/** biome-ignore-all lint/suspicious/noExplicitAny: <Tests need to have any to use methods as any> */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import hash from "../../src/models/hash.js";

describe("hash model", () => {
	let originalDigest:
		| ((
				algorithm: string | { name: string },
				data: ArrayBuffer,
		  ) => PromiseLike<ArrayBuffer>)
		| undefined;

	beforeEach(() => {
		originalDigest = (globalThis as any).crypto?.subtle?.digest;
	});

	afterEach(() => {
		if ((globalThis as any).crypto?.subtle) {
			(globalThis as any).crypto.subtle.digest = originalDigest;
		}
	});

	it("produces hex from digest (toHex)", async () => {
		(globalThis as any).crypto.subtle.digest = async (
			_alg: any,
			_data: ArrayBuffer,
		) => {
			return new Uint8Array([0, 15, 255]).buffer;
		};

		const h = await hash("anything");
		expect(h).toBe("000fff");
	});

	it("canonicalizes complex values (sorts keys, handles bigint, date, undefined -> null)", async () => {
		let capturedCanonical = "";

		(globalThis as any).crypto.subtle.digest = async (
			_alg: any,
			data: ArrayBuffer,
		) => {
			capturedCanonical = new TextDecoder().decode(data as ArrayBuffer);
			return new Uint8Array([1, 2, 3]).buffer;
		};

		const value = {
			b: 2n,
			a: new Date("2020-01-01T00:00:00.000Z"),
			c: [1, 2],
			d: undefined,
		};

		const result = await hash(value, { algorithm: "SHA-256" });
		expect(result).toBe("010203");

		const expectedCanonical = JSON.stringify({
			a: {
				$type: "date",
				value: new Date("2020-01-01T00:00:00.000Z").toISOString(),
			},
			b: { $type: "bigint", value: "2" },
			c: [1, 2],
			d: null,
		});

		expect(capturedCanonical).toBe(expectedCanonical);
	});

	it("treats null and undefined as null", async () => {
		const captured: string[] = [];
		(globalThis as any).crypto.subtle.digest = async (
			_alg: any,
			data: ArrayBuffer,
		) => {
			captured.push(new TextDecoder().decode(data as ArrayBuffer));
			return new Uint8Array([9]).buffer;
		};

		const h1 = await hash(null);
		const h2 = await hash(undefined);
		expect(h1).toBe("09");
		expect(h2).toBe("09");
		expect(captured[0]).toBe("null");
		expect(captured[1]).toBe("null");
	});

	it("throws for unsupported types: function and symbol", async () => {
		(globalThis as any).crypto.subtle.digest = async () =>
			new Uint8Array([0]).buffer;

		await expect(hash((() => {}) as any)).rejects.toThrow(
			/Unsupported type for hashing: function/,
		);
		await expect(hash(Symbol("s") as any)).rejects.toThrow(
			/Unsupported type for hashing: symbol/,
		);
	});

	it("throws for non-plain objects", async () => {
		(globalThis as any).crypto.subtle.digest = async () =>
			new Uint8Array([0]).buffer;

		class C {
			x = 1;
		}
		await expect(hash(new C() as any)).rejects.toThrow(
			/Only plain objects are supported for hashing/,
		);
	});
});
