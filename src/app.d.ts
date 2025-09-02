// See https://svelte.dev/docs/kit/types#app.d.ts

import type { Category, Secret } from '$lib/server/db';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			authenticated: boolean;
		}
		interface PageData {
			authenticated: boolean;
			salt?: string;
			categories?: Category[];
			items?: Secret[];
			categoryWidth?: number;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

declare module "argon2-wasm-esm" {
  import * as argon2 from "argon2";
  export = argon2;
}