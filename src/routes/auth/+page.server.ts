import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { auth, db } from "$lib/server";

export const load: PageServerLoad = ({ locals: { authenticated } }) => {
  if (!auth.masterPasswordSet()) return redirect(302, "/auth/init");
  if (authenticated) return redirect(302, "/");
  return {
    salt: db.config.findOne({ key: "salt" })?.value
  };
};
