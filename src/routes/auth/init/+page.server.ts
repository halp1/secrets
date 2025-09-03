import { auth, db } from "$lib/server";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  if (auth.masterPasswordSet()) throw redirect(302, "/");
};
