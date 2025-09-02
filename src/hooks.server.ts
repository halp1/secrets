import { auth } from '$lib/server';
import type { Handle } from '@sveltejs/kit';

import { ready } from '$lib/server/db';

import path from 'node:path';

globalThis.__dirname = path.join(process.cwd(), 'node_modules/argon2-wasm-esm/lib/dist');

export const handle: Handle = async ({ event, resolve }) => {
	await ready;

	const { cookies } = event;

	const payload = auth.verify(cookies.get('token'));
	event.locals.authenticated = !!(payload && typeof payload === 'object');

	return resolve(event);
};
