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
      "group cursor-pointer border-2 border-white bg-white clip-corners-xs",
      { hidden: isDragging.current }
    ]}
  >
    <div
      class="flex items-center gap-2 px-2 py-1 clip-corners-xs"
      class:group-hover:bg-gray-900={filter.category !==
        category.category.$loki}
      class:bg-black={filter.category !== category.category.$loki}
      class:bg-white={filter.category === category.category.$loki}
      class:text-black={filter.category === category.category.$loki}
      class:group-hover:bg-gray-200={filter.category ===
        category.category.$loki}
    >
      <Tag />
      <span>{category.category.name}</span>
    </div>
  </button>
  {#if isDragging.current}
    <button
      class="group cursor-pointer border-2 border-white bg-white opacity-45 clip-corners-xs"
    >
      <div
        class="flex items-center gap-2 px-2 py-1 clip-corners-xs"
        class:group-hover:bg-gray-900={filter.category !==
          category.category.$loki}
        class:bg-black={filter.category !== category.category.$loki}
        class:bg-white={filter.category === category.category.$loki}
        class:text-black={filter.category === category.category.$loki}
        class:group-hover:bg-gray-200={filter.category ===
          category.category.$loki}
      >
        <Tag />
        <span class="whitespace-nowrap">{category.category.name}</span>
      </div>
    </button>
  {/if}
</div>
