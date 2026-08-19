import { notifications } from "$lib/notifications.svelte";
import type { HttpError } from "@sveltejs/kit";

export const net = async (cb: () => PromiseLike<void>) => {
  try {
    await cb();
  } catch (e: any) {
    if ("message" in e) {
      notifications.error("An unexpected error occured.");
    } else {
      notifications.error((e as HttpError).body.message);
    }
    console.error(e);
  }
};
