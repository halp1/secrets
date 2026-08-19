import { command } from "$app/server";
import { db } from "$lib/server";
import { decrypt, encrypt } from "$lib/server/crypto";
import { error } from "@sveltejs/kit";
import * as v from "valibot";
import { authCheck } from ".";

const reveal = (doc: { $loki: number; name: string; value: string; category: number; userId: string }) => ({
  $loki: doc.$loki,
  name: decrypt(doc.name),
  value: decrypt(doc.value),
  category: doc.category,
  userId: doc.userId
});

export const create = command(
  v.object({
    name: v.string(),
    value: v.string(),
    category: v.number()
  }),
  (data) => {
    const user = authCheck();
    const category = db.categories.findOne({ $loki: data.category, userId: user.sub });
    if (!category) throw error(404, "Category not found");

    const doc = db.secrets.insertOne({
      name: encrypt(data.name),
      value: encrypt(data.value),
      category: data.category,
      userId: user.sub
    });

    if (!doc) throw error(500, "Failed to create secret");

    return reveal(doc);
  }
);

export const update = command(
  v.object({
    target: v.number(),
    props: v.partial(v.object({ key: v.string(), value: v.string() }))
  }),
  ({ target, props }) => {
    const user = authCheck();
    const doc = db.secrets.findOne({ $loki: target, userId: user.sub });
    if (!doc) throw error(404, "Secret not found");

    if (props.key) doc.name = encrypt(props.key);
    if (props.value) doc.value = encrypt(props.value);
    db.secrets.update(doc);
  }
);

export const remove = command(v.number(), (id) => {
  const user = authCheck();
  const doc = db.secrets.findOne({ $loki: id, userId: user.sub });
  if (!doc) throw error(404, "Secret not found");

  const removed = db.secrets.remove(doc);
  if (!removed) throw error(500, "Failed to remove secret");

  return { success: true };
});
