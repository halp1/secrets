<script lang="ts">
  import type { IconProps } from "@lucide/svelte";
  import type { Component } from "svelte";
  import type { MouseEventHandler } from "svelte/elements";
  import { twMerge } from "tailwind-merge";

  interface Props {
    onclick?: MouseEventHandler<HTMLButtonElement>;
    icon: Component<IconProps, {}, "">;
    type?: HTMLButtonElement["type"];
    class?: string;
    iconClass?: string;
    danger?: boolean;
  }

  const {
    onclick,
    icon: Icon,
    type = "button",
    class: className,
    iconClass,
    danger = false
  }: Props = $props();
</script>

<button
  class={twMerge(
    "flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-colors hover:bg-white/4 hover:text-accent",
    danger && "hover:text-[#ff6b6b]",
    className
  )}
  {...{ onclick, type }}
>
  <Icon size={16} class={iconClass} />
</button>
