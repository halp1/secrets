import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';

export * as auth from './auth.remote';
export * as categories from './categories.remote';
export * as secrets from './secrets.remote';

export const authCheck = () => {
	if (!getRequestEvent().locals.authenticated) throw error(401, 'Unauthorized');
};
