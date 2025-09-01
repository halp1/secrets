<script lang="ts">
	import {
		useDroppable,
		type UseDroppableArguments
	} from '@dnd-kit-svelte/core';
	import type { Snippet } from 'svelte';

	interface DroppableProps extends UseDroppableArguments {
		children: Snippet;
		class?: string;
	}

	let { children, class: className, ...rest }: DroppableProps = $props();

	const droppable = useDroppable(rest);
</script>

<div class={className} bind:this={droppable.node.current}>
	{@render children()}
</div>
