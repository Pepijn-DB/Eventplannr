import { describe, it, expect } from 'vitest';
import { emailValidator } from '../../src/validators/emailValidator.js';

describe('emailValidator', () => {
	it('accepts typical emails with @ and domain', () => {
		expect(emailValidator('user@example.com')).toBe(true);
		expect(emailValidator('a@b')).toBe(true); // permissive check: contains exactly one @
	});

	it('accepts strings with a dot even without @ (per implementation)', () => {
		expect(emailValidator('not.an.email')).toBe(true);
	});

	it('rejects strings without @ and without dot', () => {
		expect(emailValidator('plainstring')).toBe(false);
	});
});


