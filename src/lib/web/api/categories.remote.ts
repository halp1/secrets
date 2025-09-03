import { command } from "$app/server";
import { db } from "$lib/server";
import type { Category } from "$lib/server/db";
import { error } from "console";
import * as v from "valibot";
import { authCheck } from ".";

export const remove = command(v.number(), async (id) => {
  authCheck();
  db.categories.remove(id);

  db.secrets.removeWhere((secret) => secret.category === id);
});

export const create = command(
  v.object({ name: v.string(), order: v.number() }),
  async ({ name, order }): Promise<Category> => {
    authCheck();
    const doc = {
      ...(db.categories.insert({ name, order }) as Category & {
        meta?: LokiObj["meta"];
      })
    };
    delete doc.meta;
    return doc;
  }
);

export const sort = command(v.array(v.number()), async (ids: number[]) => {
  authCheck();
  ids.forEach((id, index) => {
    const category = db.categories.get(id);
    if (!category) throw error(404, "Category not found");
    category.order = index;
    console.log(category);
    db.categories.update(category);
    return category;
  });
});

export const rename = command(
  v.object({ id: v.number(), name: v.string() }),
  async ({ id, name }) => {
    authCheck();
    const category = db.categories.get(id);
    if (!category) throw error(404, "Category not found");
    category.name = name;
    db.categories.update(category);
    return category;
  }
);
