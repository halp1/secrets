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
    wrapperClass?: string;
    iconClass?: string;
  }

  const {
    onclick,
    icon: Icon,
    type,
    class: className,
    wrapperClass,
    iconClass
  }: Props = $props();
</script>

<button
  class={twMerge(
    "group cursor-pointer border-[3px] border-white bg-white clip-corners-lg",
    className
  )}
  style="--cutoff-amount: 17px !important;"
  {...{ onclick, type }}
>
  <div
    class={twMerge(
      "relative h-8 w-8 bg-black clip-corners-lg group-hover:bg-gray-900",
      wrapperClass
    )}
  >
    <Icon
      class={twMerge(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        iconClass
      )}
    />
  </div>
</button>
