<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/web";
  import { notifications } from "$lib/notifications.svelte";
  // @ts-expect-error bundled min has no types
  import argon2 from "argon2-browser/dist/argon2-bundled.min.js";

  let password = $state("");
  let submitting = $state(false);
  let error = $state("");

  const split = (data: Uint8Array) => ({
    iv: data.slice(0, 12),
    ciphertext: data.slice(12)
  });

  const decrypt = async (data: string, key: CryptoKey) => {
    const merged = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const { iv, ciphertext } = split(merged);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  };

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!password || submitting) return;
    submitting = true;
    error = "";

    try {
      const hash = await (argon2 as typeof import("argon2-browser")).hash({
        pass: password,
        salt: page.data.salt!,
        type: argon2.ArgonType.Argon2id,
        time: 3,
        mem: 65536,
        parallelism: 1,
        hashLen: 32
      });

      const key = await crypto.subtle.importKey(
        "raw",
        new Uint8Array(hash.hash),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      const decrypted = [];
      for (const secret of page.data.secrets!) {
        decrypted.push({
          id: secret.$loki,
          name: await decrypt(secret.name, key),
          value: await decrypt(secret.value, key)
        });
      }

      await api.auth.migrateVault({ password, secrets: decrypted });
      localStorage.removeItem("secrets.key");
      goto("/");
    } catch (err) {
      console.error(err);
      error = "Could not unlock the vault. Check the password.";
      notifications.error(error);
    } finally {
      submitting = false;
    }
  };
</script>

<svelte:head>
  <title>HALP/SECRETS | Unlock</title>
</svelte:head>

<div class="relative z-1 flex min-h-[100dvh] items-center justify-center p-6">
  <div
    class="card relative w-full max-w-95 animate-[fadeUp_0.5s_ease_both] border border-border bg-surface px-10 py-12"
  >
    <p class="mb-5 text-xs tracking-[0.18em] text-accent uppercase">Migrate vault.</p>
    <h1 class="font-heading mb-6 text-5xl leading-[1.1] text-text">Unlock.</h1>
    <p class="mb-8 font-mono text-sm text-muted">
      Enter the old master password to decrypt existing secrets. They will be
      re-encrypted with the server vault key.
    </p>

    {#if error}
      <div
        class="mb-5 border border-[rgba(255,80,80,0.3)] bg-[rgba(255,80,80,0.1)] px-3 py-2.5 text-sm text-[#ff8080]"
      >
        {error}
      </div>
    {/if}

    <form onsubmit={submit}>
      <label class="mb-2 block text-xs tracking-[0.14em] text-muted uppercase" for="password"
        >Master password</label
      >
      <input
        id="password"
        class="mb-5 w-full appearance-none rounded-none border border-border bg-input-bg px-3.5 py-3 font-mono text-lg text-text outline-none placeholder:text-[#333] focus:border-accent"
        type="password"
        autocomplete="current-password"
        bind:value={password}
        disabled={submitting}
      />
      <button
        type="submit"
        class="w-full cursor-pointer border-none bg-accent py-3.5 font-mono text-sm font-medium tracking-[0.12em] text-bg uppercase transition-[opacity,transform] hover:opacity-[0.88] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!password || submitting}
      >
        {submitting ? "Migrating…" : "Unlock"}
      </button>
    </form>
  </div>
</div>
