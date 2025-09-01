import { command, getRequestEvent } from '$app/server';
import { db } from '$lib/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { authCheck } from '.';

export const create = command(
	v.object({
		name: v.string(),
		value: v.string(),
		category: v.number()
	}),
	(data) => {
		authCheck();

		const doc = db.secrets.insertOne(data);

		if (!doc) throw error(500, 'Failed to create secret');

		return { ...doc, meta: undefined };
	}
);

export const remove = command(v.number(), (id) => {
	authCheck();

	const doc = db.secrets.findOne({ $loki: id });

	if (!doc) throw error(404, 'Secret not found');

	const removed = db.secrets.remove(doc);

	if (!removed) throw error(500, 'Failed to remove secret');

	return { success: true };
});
