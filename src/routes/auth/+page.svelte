<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api, toast } from "$lib/web";
  import Collapse from "$lib/web/components/Collapse.svelte";
  import { CircleX } from "@lucide/svelte";
  import type { HttpError } from "@sveltejs/kit";
  // @ts-expect-error
  import argon2 from "argon2-browser/dist/argon2-bundled.min.js";

  let password = $state("");
  let error = $state("");
  let errorPresent = $state(false);
  $effect(() => {
    if (password === "") errorPresent = false;
  });
</script>

<main class="flex h-full w-full items-center justify-center">
  <div class="border-4 border-white bg-white clip-corners-xl">
    <div class="flex h-56 w-80 flex-col bg-black px-8 py-10 clip-corners-xl">
      <h1 class="mb-auto text-center text-xl">Log In</h1>

      <form
        class="flex flex-col gap-2"
        onsubmit={async (e) => {
          e.preventDefault();
          if (!password) return;
          try {
            await api.auth.authenticate(password);
            localStorage.setItem(
              "secrets.key",
              Array.from(
                (
                  await (argon2 as typeof import("argon2-browser")).hash({
                    pass: password,
                    salt: page.data.salt!,
                    type: argon2.ArgonType.Argon2id,
                    time: 3,
                    mem: 65536, // 64 MB
                    parallelism: 1,
                    hashLen: 32
                  })
                ).hash
              )
                .map((x) => x.toString(16).padStart(2, "0"))
                .join("-")
            );
            goto("/", {
              state: {
                authenticated: true
              }
            });
          } catch (e: any) {
            if ("message" in e) {
              console.error(e);
              toast.error("An unexpected error occurred.");
              return;
            }
            error = (e as HttpError).body.message;
            errorPresent = true;
            toast.error(error);
          }
        }}
      >
        <div class="border-2 border-white bg-white clip-corners-sm">
          <input
            type="password"
            placeholder="Enter Master Password"
            bind:value={password}
            name="password"
            class="w-full rounded bg-black px-3 py-2 text-white clip-corners-sm"
          />
        </div>
        <Collapse open={errorPresent} class="flex items-center gap-2">
          <CircleX size={16} /> <span>{error}</span>
        </Collapse>
        <button
          type="submit"
          class="w-full cursor-pointer rounded bg-white py-2 font-fira text-black clip-corners-sm"
          disabled={!password}
        >
          Log In
        </button>
      </form>
    </div>
  </div>
</main>
