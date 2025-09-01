<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Secret } from '$lib/server/db';
	import {
		api,
		spring,
		net,
		dnd,
		toast,
		Droppable,
		Tag,
		type AppCategory,
		type Filter,
		Collapse
	} from '$lib/web';
	import IconButton from '$lib/web/components/IconButton.svelte';
	import {
		DndContext,
		DragOverlay,
		type DragEndEvent,
		type DragOverEvent,
		type DragStartEvent,
		type UniqueIdentifier
	} from '@dnd-kit-svelte/core';
	import {
		arrayMove,
		horizontalListSortingStrategy,
		SortableContext
	} from '@dnd-kit-svelte/sortable';
	import {
		ArrowRight,
		ChevronRight,
		Copy,
		Eye,
		Funnel,
		Plus,
		Trash
	} from '@lucide/svelte';
	import { onMount, tick } from 'svelte';
	import { fly, scale } from 'svelte/transition';

	let items = $state<{ secret: Secret; visible: boolean }[]>([]);
	let categories = $state<AppCategory[]>(
		page.data
			.categories!.toSorted((a, b) => a.order - b.order)
			.map((c) => ({ category: c, open: true }))
	);

	let loaded = $state(false);
	let initialized = $state(false);

	let key = $state<CryptoKey | null>(null);

	onMount(() => {
		const raw = localStorage.getItem('secrets.key');
		if (!raw) {
			toast.error('No key found in local storage, try logging in again?');
			api.auth.logout().then(() => goto('/auth'));
			return;
		}

		crypto.subtle
			.importKey(
				'raw',
				new Uint8Array(raw.split('-').map((x) => parseInt(x, 16))),
				{ name: 'AES-GCM' },
				false,
				['encrypt', 'decrypt']
			)
			.then(async (cryptoKey) => {
				key = cryptoKey;
				items = await Promise.all(
					page.data.items!.map(async (item) => ({
						secret: {
							...item,
							name: await decrypt(item.name),
							value: await decrypt(item.value)
						},
						visible: false
					}))
				);
				loaded = true;
				await tick();
				initialized = true;
			});
	});

	const concat = (iv: Uint8Array, ciphertext: ArrayBuffer) => {
		const merged = new Uint8Array(iv.length + ciphertext.byteLength);
		merged.set(iv, 0);
		merged.set(new Uint8Array(ciphertext), iv.length);
		return merged;
	};

	const split = (data: Uint8Array) => ({
		iv: data.slice(0, 12),
		ciphertext: data.slice(12)
	});

	const encrypt = async (data: string) => {
		if (!key) throw new Error('No key available for encryption');
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const encoded = new TextEncoder().encode(data);
		const ciphertext = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv
			},
			key,
			encoded
		);
		return btoa(String.fromCharCode(...concat(iv, ciphertext)));
	};

	const decrypt = async (data: string) => {
		if (!key) throw new Error('No key available for decryption');
		const merged = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
		const { iv, ciphertext } = split(merged);
		const decrypted = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv
			},
			key,
			ciphertext
		);
		return new TextDecoder().decode(decrypted);
	};

	const addItem = async (name: string, value: string, category: number) => {
		if (!key) throw new Error('No key available for encryption');
		const encryptedName = await encrypt(name);
		const encryptedValue = await encrypt(value);
		await net(async () => {
			const newItem = await api.secrets.create({
				name: encryptedName,
				value: encryptedValue,
				category
			});
			newItem.name = await decrypt(newItem.name);
			newItem.value = await decrypt(newItem.value);

			items = [...items, { secret: newItem, visible: false }];
		});
	};

	const deleteItem = async (id: number) => {
		await net(async () => {
			await api.secrets.remove(id);
			items = items.filter((item) => item.secret.$loki !== id);
		});
	};

	const addCategory = async (name: string) => {
		await net(async () => {
			const newCategory = await api.categories.create({
				name,
				order: categories.length
					? categories[categories.length - 1].category.order + 1
					: 0
			});
			categories = [...categories, { category: newCategory, open: true }];
		});
	};

	const deleteCategory = async (id: number) => {
		await net(async () => {
			await api.categories.remove(id);
			categories = categories.filter((c) => c.category.$loki !== id);
			items = items.filter((i) => i.secret.category !== id);
		});
	};

	let filter = $state<Filter>({
		search: '',
		category: -1
	});

	let addCategoryValue = $state<string | null>(null);
	let addCategoryInput = $state<HTMLInputElement | null>(null);

	let editingCategory = $state<number | null>(null);
	const updateCategory = async (id: number, name: string) => {
		if (!name.trim()) return;
		await net(async () => {
			await api.categories.rename({ id, name });
			categories = categories.map((cat) =>
				cat.category.$loki === id
					? { ...cat, category: { ...cat.category, name } }
					: cat
			);
			editingCategory = null;
		});
	};

	onMount(() => {
		const keyHandler = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				addCategoryValue = null;
				addCategoryInput?.blur();
				editingCategory = null;
			}
		};

		window.addEventListener('keydown', keyHandler);

		return () => {
			window.removeEventListener('keydown', keyHandler);
		};
	});

	let activeTagID = $state<UniqueIdentifier | null>(null);
	let activeTag = $derived(
		categories.find((cat) => cat.category.$loki === activeTagID)
	);

	const dragStart = (e: DragStartEvent) => {
		activeTagID = e.active.id;
	};

	const dragEnd = async ({ active, over }: DragEndEvent) => {
		if (!over) return;
		const target = $state.snapshot(
			categories.find((cat) => cat.category.$loki === over.id)
		);

		if (!target || target.category.$loki === active.id) return;

		const oldIndex = $state.snapshot(
			categories.findIndex((cat) => cat.category.$loki === active.id)
		);
		const newIndex = $state.snapshot(
			categories.findIndex(
				(cat) => cat.category.$loki === target.category.$loki
			)
		);

		categories = arrayMove(categories, oldIndex, newIndex).map((c, idx) => ({
			...c,
			category: { ...c.category, order: idx }
		}));

		await net(async () => {
			await api.categories.sort(categories.map((c) => c.category.$loki));
		});

		activeTagID = null;
	};

	const dragOver = ({ active, over }: DragOverEvent) => {
		if (!over) return;

		const activeTag = $state.snapshot(
			categories.find((cat) => cat.category.$loki === active.id)
		);
		if (!activeTag) return;

		const overTag = $state.snapshot(
			categories.find((cat) => cat.category.$loki === over.id)
		);
		if (!overTag) return;

		// actually i lied we dont need to do anything in this function
	};
</script>

{#if loaded}
	<div class="flex h-full flex-col p-10 pb-0">
		<div
			class="border-2 border-white bg-white clip-corners-sm"
			in:fly|global={{
				delay: 0,
				duration: 1000,
				opacity: 0,
				y: -20,
				easing: spring(400, 20)
			}}
		>
			<label
				class="flex w-full items-center gap-2 bg-black pl-2 clip-corners-sm"
			>
				<span
					in:fly|global={{
						delay: 100,
						duration: 1000,
						opacity: 0,
						y: -20,
						easing: spring(400, 20)
					}}
				>
					<Funnel />
				</span>
				<input
					type="text"
					placeholder="`/` to filter"
					bind:value={filter.search}
					name="search"
					class="flex-1 bg-black py-2 text-white outline-none"
				/>
			</label>
		</div>
		<div class="mt-5 flex items-center gap-2">
			<DndContext
				sensors={dnd.sensors}
				onDragStart={dragStart}
				onDragEnd={dragEnd}
				onDragOver={dragOver}
			>
				<SortableContext
					items={categories.map((cat) => cat.category.$loki)}
					strategy={horizontalListSortingStrategy}
				>
					<Droppable class="flex items-center gap-2" id={-1}>
						{#each categories as cat, idx (cat.category.$loki)}
							<div
								in:fly|global={{
									delay: initialized ? 0 : (idx + 1) * 100,
									duration: 1000,
									opacity: 0,
									x: -20,
									easing: spring(400, 20)
								}}
							>
								<Tag category={cat} {filter} />
							</div>
						{/each}
					</Droppable>
				</SortableContext>
				<DragOverlay dropAnimation={dnd.dropAnimation}>
					{#if activeTag && activeTagID}
						<Tag category={activeTag} {filter} />
					{/if}
				</DragOverlay>
			</DndContext>
			<span
				in:fly|global={{
					delay: (categories.length + 1) * 100,
					duration: 1000,
					opacity: 0,
					x: -20,
					easing: spring(400, 20)
				}}
			>
				<IconButton
					icon={Plus}
					wrapperClass={addCategoryValue !== null
						? 'bg-white text-black group-hover:bg-gray-200'
						: ''}
					onclick={async (e) => {
						e.preventDefault();
						if (addCategoryValue !== null) {
							addCategoryValue = null;
						} else {
							addCategoryValue = '';
							e.currentTarget.blur();
							await tick();
							addCategoryInput?.focus();
						}
					}}
				/>
			</span>

			<form
				class="border-2 border-white bg-white clip-corners-sm"
				class:invisible={addCategoryValue === null}
				onsubmit={async (e) => {
					e.preventDefault();
					if (addCategoryValue && addCategoryValue.trim().length > 0) {
						await addCategory(addCategoryValue.trim());
						addCategoryValue = null;
					}
				}}
			>
				<input
					disabled={addCategoryValue === null}
					type="text"
					placeholder="Category name"
					bind:value={addCategoryValue}
					bind:this={addCategoryInput}
					name="category"
					class="w-64 rounded bg-black px-3 py-2 text-white clip-corners-sm"
				/>
			</form>
		</div>
		<div
			class="mt-5 h-0.5 w-full bg-white"
			in:scale|global={{
				delay: (categories.length + 1) * 100 + 100,
				duration: 1000,
				opacity: 0,
				easing: spring(400, 33)
			}}
		></div>
		<div
			class="no-scrollbar flex max-h-[calc(100vh-215px)] flex-1 flex-col gap-10 overflow-y-auto py-5"
		>
			{#each categories as cat, idx}
				{#if filter.category === -1 || filter.category === cat.category.$loki}
					<div
						class="border-4 bg-white clip-corners-lg"
						in:fly|global={{
							delay: (categories.length + 1) * 100 + 200 + idx * 150,
							duration: 1000,
							opacity: 0,
							y: -20,
							easing: spring(400, 20)
						}}
					>
						<div class="bg-black p-5 clip-corners-lg">
							<!-- header -->
							<div class="-my-1 flex items-center">
								<IconButton
									icon={ChevronRight}
									class={`mr-4 ${cat.open ? 'rotate-90' : 'rotate-0'}`}
									onclick={() => (cat.open = !cat.open)}
									iconClass="ml-[1px]"
								/>

								{#if editingCategory === cat.category.$loki}
									<input
										type="text"
										name="name"
										defaultValue={cat.category.name}
										onblur={(e) =>
											updateCategory(cat.category.$loki, e.currentTarget.value)}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												updateCategory(
													cat.category.$loki,
													e.currentTarget.value
												);
											}
										}}
										class="-mb-0.5 border-b-2 border-white bg-black text-xl text-white outline-none"
									/>
								{:else}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="text-xl"
										ondblclick={async (e) => {
											const parent = e.currentTarget.parentElement;
											editingCategory = cat.category.$loki;
											await tick();
											const target = parent?.querySelector('input');
											target?.focus();
											target?.select();
										}}
									>
										{cat.category.name}
									</div>
								{/if}
								<!-- <IconButton
									icon={Trash}
									class="ml-auto clip-corners-lg"
									wrapperClass="h-10 w-10 clip-corners-lg"
									
								/> -->
								<Trash
									class="mr-[7px] ml-auto cursor-pointer hover:shake-rotate"
									onclick={async () => {
										if (
											!confirm(
												'Are you sure you want to delete this category? All related secrets will be deleted.'
											)
										)
											return;

										deleteCategory(cat.category.$loki);
									}}
								/>
							</div>
							<Collapse open={cat.open} class="pb-5">
								<!-- new secret editor -->
								<form
									class="mt-5 flex items-center gap-2"
									onsubmit={async (e) => {
										e.preventDefault();
										const formData = new FormData(e.currentTarget);
										const target = e.currentTarget;
										const key = formData.get('key');
										const value = formData.get('value');
										if (
											typeof key === 'string' &&
											typeof value === 'string' &&
											key.length &&
											value.length
										) {
											await addItem(key, value, cat.category.$loki);
											target.reset();
										} else {
											toast.error('Key or value missing');
										}
									}}
								>
									<div class="border-2 border-white bg-white clip-corners-sm">
										<input
											type="text"
											placeholder="Key"
											name="key"
											class="w-full rounded bg-black px-3 py-2 text-white clip-corners-sm"
										/>
									</div>
									<div
										class="flex-1 border-2 border-white bg-white clip-corners-sm"
									>
										<input
											type="password"
											placeholder="Value"
											name="value"
											class="w-full rounded bg-black px-3 py-2 text-white clip-corners-sm"
										/>
									</div>
									<IconButton icon={Plus} type="submit" />
								</form>
								<div class="mt-5 flex flex-col gap-2">
									<!-- all items -->
									{#each items
										.filter((item) => item.secret.category === cat.category.$loki)
										.filter((item) => item.secret.name
												.toLowerCase()
												.includes(filter.search.toLowerCase()))
										.toSorted( (a, b) => a.secret.name.localeCompare(b.secret.name) ) as item (item.secret.$loki)}
										<div
											class="border-whtie border-2 bg-white clip-corners-sm"
											transition:fly|local={{
												duration: 150
											}}
										>
											<div
												class="flex items-center gap-4 bg-black pl-4 clip-corners-sm"
											>
												<div
													class="relative flex h-11 flex-1 items-center gap-1 overflow-hidden"
												>
													<div class="bg-white pr-0.5 clip-arrow-right">
														<div
															class="flex h-11 items-center justify-center bg-black pr-4 clip-arrow-right"
														>
															<span class="truncate">{item.secret.name}</span>
														</div>
													</div>

													<div class="ml-2 truncate py-1">
														{#if item.visible}
															{item.secret.value}
														{:else}
															{'●'.repeat(item.secret.value.length)}
														{/if}
													</div>
												</div>
												<div class="flex items-center">
													<button
														class="group -ml-3 cursor-pointer border-white bg-white pl-0.5 clip-arrow-left"
														onclick={() => (item.visible = !item.visible)}
													>
														<div
															class="flex h-11 items-center justify-center bg-black pr-5 pl-4 clip-arrow-left group-hover:bg-black/90"
															class:bg-white={item.visible}
															class:text-black={item.visible}
															class:hover:bg-gray-200={item.visible}
														>
															<Eye />
														</div>
													</button>
													<button
														class="group -ml-3 cursor-pointer border-white bg-white pl-0.5 clip-arrow-left"
														onclick={() =>
															navigator.clipboard
																.writeText(item.secret.value)
																.then(() =>
																	toast.success('Copied to clipboard')
																)}
													>
														<div
															class="flex h-11 items-center justify-center bg-black pr-5 pl-4 clip-arrow-left group-hover:bg-black/90"
														>
															<Copy />
														</div>
													</button>
													<button
														class="group -ml-3 cursor-pointer border-white bg-white pl-0.5 clip-arrow-left"
														onclick={() => deleteItem(item.secret.$loki)}
													>
														<div
															class="flex h-11 items-center justify-center bg-black pr-3 pl-4 clip-arrow-left group-hover:bg-black/90"
														>
															<Trash />
														</div>
													</button>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</Collapse>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}
