import { command } from "$app/server";
import { error } from "@sveltejs/kit";
import { config, secrets, categories } from "../../server/db";
import * as v from "valibot";
import argon2 from "@node-rs/argon2/index.js";
import { authCheck } from ".";
import { encrypt } from "$lib/server/crypto";

export const migrateVault = command(
  v.object({
    password: v.string(),
    secrets: v.array(
      v.object({
        id: v.number(),
        name: v.string(),
        value: v.string()
      })
    )
  }),
  async ({ password, secrets: decrypted }) => {
    const user = authCheck();
    const stored = config.findOne({ key: "masterPassword" });
    if (!stored) throw error(400, "Nothing to migrate");
    if (!(await argon2.verify(stored.value, password))) {
      throw error(401, "Invalid password");
    }

    const existing = secrets.find();
    if (existing.length !== decrypted.length) {
      throw error(400, "Secret count mismatch");
    }

    const byId = new Map(decrypted.map((item) => [item.id, item]));
    for (const doc of existing) {
      const plain = byId.get(doc.$loki);
      if (!plain) throw error(400, "Missing decrypted secret");
      doc.name = encrypt(plain.name);
      doc.value = encrypt(plain.value);
      doc.userId = user.sub;
      secrets.update(doc);
    }

    for (const category of categories.find()) {
      category.userId = user.sub;
      categories.update(category);
    }

    config.remove(stored);
    const salt = config.findOne({ key: "salt" });
    if (salt) config.remove(salt);
  }
);
