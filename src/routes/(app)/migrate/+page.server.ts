import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server";

export const load: PageServerLoad = () => {
  if (!db.vaultNeedsMigration()) redirect(302, "/");

  const salt = db.config.findOne({ key: "salt" });
  if (!salt) throw new Error("Vault salt missing");

  return {
    salt: salt.value as string,
    secrets: db.secrets.find().map((item) => ({
      $loki: item.$loki,
      name: item.name,
      value: item.value
    }))
  };
};
