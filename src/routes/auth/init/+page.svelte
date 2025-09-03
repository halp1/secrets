<script lang="ts">
  import { goto } from "$app/navigation";
  import { api, toast } from "$lib/web";
  import Collapse from "$lib/web/components/Collapse.svelte";
  import { CircleX } from "@lucide/svelte";

  let p1 = $state("");
  let p2 = $state("");

  let valid = $derived(p1.length > 0 && p1 === p2);
  let error = $derived(p1.length > 0 && p1 !== p2);
</script>

<main class="flex h-full w-full items-center justify-center">
  <div class="border-4 border-white bg-white clip-corners-xl">
    <div class="flex h-80 w-80 flex-col bg-black px-8 py-10 clip-corners-xl">
      <h1 class="mb-auto text-center text-xl">Set Master Password</h1>

      <form
        class="flex flex-col gap-4"
        onsubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;

          try {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            await api.auth.setMasterPassword([
              p1,
              Array.from(salt)
                .map((x) => x.toString(16).padStart(2, "0"))
                .join("")
            ]);
            goto("/auth");
          } catch {
            toast.error("Failed to set master password");
          }
        }}
      >
        <div class="border-2 border-white bg-white clip-corners-sm">
          <input
            type="password"
            placeholder="Enter Master Password"
            bind:value={p1}
            name="p1"
            class="w-full rounded bg-black px-3 py-2 text-white clip-corners-sm"
          />
        </div>
        <div class="border-2 border-white bg-white clip-corners-sm">
          <input
            type="password"
            placeholder="Confirm Master Password"
            bind:value={p2}
            name="p2"
            class="w-full rounded bg-black px-3 py-2 text-white clip-corners-sm"
          />
        </div>
        <Collapse
          open={error}
          containerClass={error ? "" : "-mb-4"}
          class="flex items-center gap-2"
        >
          <CircleX size={16} /> <span>Passwords do not match.</span>
        </Collapse>
        <button
          type="submit"
          class="w-full cursor-pointer rounded bg-white py-2 font-fira text-black clip-corners-sm"
          disabled={!valid}
        >
          Set Password
        </button>
      </form>
    </div>
  </div>
</main>
