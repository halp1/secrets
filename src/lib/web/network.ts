import type { HttpError } from '@sveltejs/kit';
import { toast } from './toast';

export const net = async (cb: () => PromiseLike<void>) => {
	try {
		await cb();
	} catch (e: any) {
		if ('message' in e) {
			toast.error('An unexpected error occured.');
		} else {
			toast.error((e as HttpError).body.message);
		}
		console.error(e);
	}
};
