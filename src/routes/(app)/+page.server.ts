import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server";
import { decrypt } from "$lib/server/crypto";

export const load: PageServerLoad = ({ locals }) => {
  if (db.vaultNeedsMigration()) redirect(302, "/migrate");

  const userId = locals.user!.sub;
  db.ensureUserCategories(userId);

  return {
    categories: db.categories.find({ userId }).map((category) => ({
      $loki: category.$loki,
      name: category.name,
      order: category.order,
      userId: category.userId
    })),
    items: db.secrets.find({ userId }).map((item) => ({
      $loki: item.$loki,
      name: decrypt(item.name),
      value: decrypt(item.value),
      category: item.category,
      userId: item.userId
    }))
  };
};
