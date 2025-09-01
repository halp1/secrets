import loki from 'lokijs';
import path from 'node:path';

let resolve: () => void;
export let ready = new Promise<void>((res) => {
	resolve = res;
});

const db = new loki(path.join(process.cwd(), 'data', 'data.db'), {
	autoload: true,
	autosave: true,
	autoloadCallback: () => {
		config = db.addCollection('config');
		categories = db.addCollection('categories');
		if (!categories.findOne({ name: 'Other' })) {
			categories.insert({ name: 'Other', order: 0 });
		}
		secrets = db.addCollection('secrets');
		resolve();
	}
});

export interface ConfigItem<T> {
	key: string;
	value: T;
}

export let config: Collection<ConfigItem<any>>;

export interface Category {
	$loki: number;
	name: string;
	order: number;
}

export let categories: Collection<Omit<Category, '$loki'>>;

export interface Secret {
	$loki: number;
	name: string;
	value: string;
	category: number;
}

export let secrets: Collection<Omit<Secret, '$loki'>>;
