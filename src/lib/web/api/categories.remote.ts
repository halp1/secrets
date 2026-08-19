import { command } from "$app/server";
import { db } from "$lib/server";
import type { Category } from "$lib/server/db";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { authCheck } from ".";

const strip = (doc: Category & { meta?: unknown }) => {
  const copy = { ...doc };
  delete copy.meta;
  return copy as Category;
};

export const remove = command(v.number(), async (id) => {
  const user = authCheck();
  const category = db.categories.findOne({ $loki: id, userId: user.sub });
  if (!category) throw error(404, "Category not found");

  db.categories.remove(category);
  db.secrets.removeWhere((secret) => secret.category === id && secret.userId === user.sub);
});

export const create = command(
  v.object({ name: v.string(), order: v.number() }),
  async ({ name, order }): Promise<Category> => {
    const user = authCheck();
    const doc = db.categories.insert({ name, order, userId: user.sub }) as Category & {
      meta?: unknown;
    };
    return strip(doc);
  }
);

export const sort = command(v.array(v.number()), async (ids: number[]) => {
  const user = authCheck();
  ids.forEach((id, index) => {
    const category = db.categories.findOne({ $loki: id, userId: user.sub });
    if (!category) throw error(404, "Category not found");
    category.order = index;
    db.categories.update(category);
  });
});

export const rename = command(
  v.object({ id: v.number(), name: v.string() }),
  async ({ id, name }) => {
    const user = authCheck();
    const category = db.categories.findOne({ $loki: id, userId: user.sub });
    if (!category) throw error(404, "Category not found");
    category.name = name;
    db.categories.update(category);
    return strip(category);
  }
);
