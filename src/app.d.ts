import type { SessionUser } from "$lib/session";
import type { Category, Secret } from "$lib/server/db";

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
    }
    interface PageData {
      user: SessionUser | null;
      salt?: string;
      categories?: Category[];
      items?: Secret[];
      secrets?: Pick<Secret, "$loki" | "name" | "value">[];
    }
  }
}

export {};
