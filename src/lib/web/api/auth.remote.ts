import { command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { config } from '../../server/db';
import * as v from 'valibot';
import argon2 from '@node-rs/argon2/index.js';
import { JWT_SECRET } from '$env/static/private';
import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

export const setMasterPassword = command(
	v.tuple([v.string(), v.string()]),
	async ([password, salt]) => {
		if (config.findOne({ key: 'masterPassword' }))
			throw error(400, 'Master password is already set');

		const hash = await argon2.hash(password, {
			memoryCost: 65536,
			timeCost: 3,
			parallelism: 1
		});

		config.insert({ key: 'masterPassword', value: hash });
		config.insert({ key: 'salt', value: salt });
	}
);

export const authenticate = command(v.string(), async (password) => {
	const stored = config.findOne({ key: 'masterPassword' });
	if (!stored) throw error(400, 'Master password is not set');
	if (!(await argon2.verify(stored.value, password)))
		throw error(401, 'Invalid password');

	// set jwt token
	const { cookies } = getRequestEvent();

	const tokenBody = {
		sub: 0,
		key: crypto.createHash('sha256').update(password).digest('hex'),
		iat: Date.now()
	};

	const token = jwt.sign(tokenBody, JWT_SECRET, { expiresIn: '1h' });

	cookies.set('token', token, {
		httpOnly: true,
		path: '/',
		maxAge: 60 * 60
	});
});

export const logout = command(async () => {
	const { cookies } = getRequestEvent();
	cookies.delete('token', {
		httpOnly: true,
		path: '/',
		maxAge: 0
	});
});
