import { getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";

export * as auth from "./auth.remote";
export * as categories from "./categories.remote";
export * as secrets from "./secrets.remote";

export const authCheck = () => {
  const user = getRequestEvent().locals.user;
  if (!user) throw error(401, "Unauthorized");
  return user;
};
