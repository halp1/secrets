import type { Category } from '$lib/server/db';

export interface AppCategory {
	open: boolean;
	category: Category;
}

export interface Filter {
	search: string;
	category: number;
}
