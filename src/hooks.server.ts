import { auth } from '$lib/server';
import type { Handle } from '@sveltejs/kit';

import { ready } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	await ready;

	const { cookies } = event;

	const payload = auth.verify(cookies.get('token'));
	event.locals.authenticated = !!(payload && typeof payload === 'object');

	return resolve(event);
};
