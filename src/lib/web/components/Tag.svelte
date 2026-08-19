<script lang="ts">
  import { crossfade } from "svelte/transition";
  import { Tag } from "@lucide/svelte";
  import { useSortable } from "@dnd-kit-svelte/sortable";
  import { styleObjectToString, CSS } from "@dnd-kit-svelte/utilities";
  import type { AppCategory, Filter } from "../types";

  interface Props {
    category: AppCategory;
    filter: Filter;
  }

  let { category = $bindable(), filter = $bindable() }: Props = $props();

  const [send, receive] = crossfade({ duration: 100 });

  const {
    attributes,
    listeners,
    node,
    transform,
    transition,
    isDragging,
    isSorting
  } = useSortable({
    id: category.category.$loki
  });

  const style = $derived(
    styleObjectToString({
      transform: CSS.Transform.toString(transform.current),
      transition: isSorting.current ? transition.current : undefined,
      zIndex: isDragging.current ? 1 : undefined
    })
  );

  const selected = $derived(filter.category === category.category.$loki);
</script>

<div
  in:receive={{ key: category.category.$loki }}
  out:send={{ key: category.category.$loki }}
  class="relative select-none"
  bind:this={node.current}
  {style}
  {...listeners.current}
  {...attributes.current}
>
  <button
    onclick={() => {
      if (filter.category === category.category.$loki) {
        filter = { ...filter, category: -1 };
      } else {
        filter = { ...filter, category: category.category.$loki };
        category.open = true;
      }
    }}
    class={[
      "flex cursor-pointer items-center gap-1.5 border px-2 py-1 font-mono text-xs tracking-[0.08em] uppercase transition-colors",
      selected
        ? "border-accent bg-accent text-bg"
        : "border-border bg-transparent text-muted hover:border-accent hover:text-accent",
      { hidden: isDragging.current }
    ]}
  >
    <Tag size={12} />
    <span>{category.category.name}</span>
  </button>
  {#if isDragging.current}
    <button
      class="flex cursor-pointer items-center gap-1.5 border border-border bg-transparent px-2 py-1 font-mono text-xs tracking-[0.08em] text-muted uppercase opacity-45"
    >
      <Tag size={12} />
      <span class="whitespace-nowrap">{category.category.name}</span>
    </button>
  {/if}
</div>
