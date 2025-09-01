import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth, db } from '$lib/server';

export const load: PageServerLoad = ({ locals: { authenticated } }) => {
	if (!authenticated || !auth.masterPasswordSet()) return redirect(302, '/auth');

	return {
		categories: db.categories.find().map((category) => ({ ...category, meta: undefined })),
		items: db.secrets.find().map((item) => ({ ...item, meta: undefined }))
	};
};
