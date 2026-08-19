import loki from "lokijs";
import path from "node:path";
import fs from "node:fs";

let resolve: () => void;
export let ready = new Promise<void>((res) => {
  resolve = res;
});

function LokiFsAdapter() {
  // @ts-expect-error
  this.fs = fs;
}

LokiFsAdapter.prototype = loki.LokiFsAdapter.prototype;
LokiFsAdapter.prototype.constructor = LokiFsAdapter;
// @ts-expect-error
loki.LokiFsAdapter = LokiFsAdapter;

fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true });

const db = new loki(path.join(process.cwd(), "data", "data.db"), {
  // @ts-expect-error
  adapter: new LokiFsAdapter(),
  autoload: true,
  autosave: true,
  autoloadCallback: () => {
    config = db.addCollection("config");
    categories = db.addCollection("categories");
    secrets = db.addCollection("secrets");
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
  userId: string;
}

export let categories: Collection<Omit<Category, "$loki">>;

export interface Secret {
  $loki: number;
  name: string;
  value: string;
  category: number;
  userId: string;
}

export let secrets: Collection<Omit<Secret, "$loki">>;

export const vaultNeedsMigration = () => !!config.findOne({ key: "masterPassword" });

export const ensureUserCategories = (userId: string) => {
  if (!categories.findOne({ userId })) {
    categories.insert({ name: "Other", order: 0, userId });
  }
};
