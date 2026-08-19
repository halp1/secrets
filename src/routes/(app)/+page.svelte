<script lang="ts">
  import { page } from "$app/state";
  import type { Secret } from "$lib/server/db";
  import {
    api,
    net,
    dnd,
    toast,
    Droppable,
    Tag,
    type AppCategory,
    type Filter,
    Collapse,
    IconButton
  } from "$lib/web";
  import {
    DndContext,
    DragOverlay,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    type UniqueIdentifier
  } from "@dnd-kit-svelte/core";
  import {
    arrayMove,
    horizontalListSortingStrategy,
    SortableContext
  } from "@dnd-kit-svelte/sortable";
  import {
    Check,
    ChevronRight,
    Copy,
    Eye,
    EyeOff,
    Funnel,
    Pencil,
    Plus,
    Trash
  } from "@lucide/svelte";
  import { onMount, tick } from "svelte";

  let items = $state<
    {
      secret: Secret;
      visible: boolean;
      editing: {
        key: boolean;
        value: boolean;
      };
    }[]
  >(
    page.data.items!.map((item) => ({
      secret: item,
      visible: false,
      editing: { key: false, value: false }
    }))
  );

  let categories = $state<AppCategory[]>(
    page.data
      .categories!.toSorted((a, b) => a.order - b.order)
      .map((c) => ({ category: c, open: true }))
  );

  const addItem = async (name: string, value: string, category: number) => {
    await net(async () => {
      const newItem = await api.secrets.create({ name, value, category });
      items = [
        ...items,
        {
          secret: newItem,
          visible: false,
          editing: { key: false, value: false }
        }
      ];
    });
  };

  const updateItem = async (
    id: number,
    props: Partial<{ key: string; value: string }>
  ) =>
    await net(async () => {
      await api.secrets.update({ target: id, props });
      const item = items.find((item) => item.secret.$loki === id);
      if (item) {
        item.secret.name = props.key ?? item.secret.name;
        item.secret.value = props.value ?? item.secret.value;
        if (props.key) item.editing.key = false;
        if (props.value) item.editing.value = false;
      }
    });

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
    search: "",
    category: -1
  });

  let addCategoryValue = $state<string | null>(null);
  let addCategoryInput = $state<HTMLInputElement | null>(null);
  let searchInput = $state<HTMLInputElement | null>(null);

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
      if (event.key === "Escape") {
        addCategoryValue = null;
        addCategoryInput?.blur();
        editingCategory = null;
      }

      if (event.key === "/" && document.activeElement !== addCategoryInput) {
        const tag = (document.activeElement as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        event.preventDefault();
        searchInput?.focus();
      }
    };

    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
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

  const dragOver = (_e: DragOverEvent) => {};

  let copiedId = $state<number | null>(null);
  const copyValue = async (item: { secret: Secret }) => {
    await navigator.clipboard.writeText(item.secret.value);
    copiedId = item.secret.$loki;
    toast.success("Copied");
    setTimeout(() => {
      if (copiedId === item.secret.$loki) copiedId = null;
    }, 2000);
  };
</script>

<svelte:head>
  <title>HALP/SECRETS</title>
</svelte:head>

<main class="flex flex-1 flex-col p-4 pt-6 pb-[calc(1.5rem+var(--safe-bottom))] md:p-6">
  <div class="mx-auto w-full max-w-4xl">
    <p class="mb-2 text-xs tracking-[0.18em] text-accent uppercase">Vault</p>
    <h1 class="font-heading mb-8 text-3xl leading-[1.1] text-text md:text-4xl">
      Secrets.
    </h1>

    <label class="mb-4 flex items-center gap-2 border border-border bg-surface px-3">
      <Funnel size={14} class="text-muted" />
      <input
        bind:this={searchInput}
        type="text"
        placeholder="/ to filter"
        bind:value={filter.search}
        name="search"
        class="flex-1 rounded-none border-none bg-transparent py-2.5 font-mono text-sm text-text outline-none placeholder:text-[#333]"
      />
    </label>

    <div class="mb-6 flex flex-wrap items-center gap-2">
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
          <Droppable class="flex flex-wrap items-center gap-2" id={-1}>
            {#each categories as cat (cat.category.$loki)}
              <Tag category={cat} {filter} />
            {/each}
          </Droppable>
        </SortableContext>
        <DragOverlay dropAnimation={dnd.dropAnimation}>
          {#if activeTag && activeTagID}
            <Tag category={activeTag} {filter} />
          {/if}
        </DragOverlay>
      </DndContext>

      <IconButton
        icon={Plus}
        class={addCategoryValue !== null ? "text-accent" : ""}
        onclick={async (e) => {
          e.preventDefault();
          if (addCategoryValue !== null) {
            addCategoryValue = null;
          } else {
            addCategoryValue = "";
            e.currentTarget.blur();
            await tick();
            addCategoryInput?.focus();
          }
        }}
      />

      {#if addCategoryValue !== null}
        <form
          class="flex items-center"
          onsubmit={async (e) => {
            e.preventDefault();
            if (addCategoryValue && addCategoryValue.trim().length > 0) {
              await addCategory(addCategoryValue.trim());
              addCategoryValue = null;
            }
          }}
        >
          <input
            bind:this={addCategoryInput}
            bind:value={addCategoryValue}
            type="text"
            placeholder="Category name"
            name="category"
            class="w-48 rounded-none border border-border bg-input-bg px-2.5 py-1.5 font-mono text-sm text-text outline-none placeholder:text-[#333] focus:border-accent"
          />
        </form>
      {/if}
    </div>

    <div class="flex flex-col gap-4">
      {#each categories as cat (cat.category.$loki)}
        {#if (filter.category === -1 || filter.category === cat.category.$loki) && (filter.search.trim().length === 0 || items.some((item) => item.secret.category === cat.category.$loki && item.secret.name
                    .toLowerCase()
                    .includes(filter.search.toLowerCase().trim())))}
          <section class="card animate-[fadeUp_0.2s_ease_both] border border-border bg-surface p-4 md:p-5">
            <div class="mb-3 flex items-center gap-2">
              <button
                type="button"
                class="flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-muted transition-colors hover:text-accent"
                onclick={() => (cat.open = !cat.open)}
                aria-label={cat.open ? "Collapse" : "Expand"}
              >
                <ChevronRight size={16} class={cat.open ? "rotate-90" : ""} />
              </button>

              {#if editingCategory === cat.category.$loki}
                <input
                  type="text"
                  name="name"
                  defaultValue={cat.category.name}
                  onblur={(e) =>
                    updateCategory(cat.category.$loki, e.currentTarget.value)}
                  onkeydown={(e) => {
                    if (e.key === "Enter") {
                      updateCategory(cat.category.$loki, e.currentTarget.value);
                    }
                    if (e.key === "Escape") editingCategory = null;
                  }}
                  class="flex-1 rounded-none border-b border-border bg-transparent font-mono text-sm text-text outline-none focus:border-accent"
                />
              {:else}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <h2
                  class="flex-1 font-mono text-sm tracking-[0.08em] text-text uppercase"
                  ondblclick={async (e) => {
                    const parent = e.currentTarget.parentElement;
                    editingCategory = cat.category.$loki;
                    await tick();
                    parent?.querySelector("input")?.focus();
                    parent?.querySelector("input")?.select();
                  }}
                >
                  {cat.category.name}
                </h2>
              {/if}

              <IconButton
                icon={Trash}
                danger
                onclick={() => {
                  if (
                    !confirm(
                      "Delete this category and all secrets in it?"
                    )
                  )
                    return;
                  deleteCategory(cat.category.$loki);
                }}
              />
            </div>

            <Collapse open={cat.open}>
              <form
                class="mb-3 flex items-center gap-2"
                onsubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const target = e.currentTarget;
                  const key = formData.get("key");
                  const value = formData.get("value");
                  if (
                    typeof key === "string" &&
                    typeof value === "string" &&
                    key.length &&
                    value.length
                  ) {
                    await addItem(key, value, cat.category.$loki);
                    target.reset();
                  } else {
                    toast.error("Key or value missing");
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Key"
                  name="key"
                  class="w-40 rounded-none border border-border bg-input-bg px-2.5 py-1.5 font-mono text-sm text-text outline-none placeholder:text-[#333] focus:border-accent md:w-52"
                />
                <input
                  type="password"
                  placeholder="Value"
                  name="value"
                  class="flex-1 rounded-none border border-border bg-input-bg px-2.5 py-1.5 font-mono text-sm text-text outline-none placeholder:text-[#333] focus:border-accent"
                />
                <button
                  type="submit"
                  class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-none bg-accent text-bg transition-opacity hover:opacity-[0.88]"
                  aria-label="Add secret"
                >
                  <Plus size={14} />
                </button>
              </form>

              <div class="flex flex-col">
                {#each items
                  .filter((item) => item.secret.category === cat.category.$loki)
                  .filter((item) => item.secret.name
                      .toLowerCase()
                      .includes(filter.search.toLowerCase()))
                  .toSorted((a, b) => a.secret.name.localeCompare(b.secret.name)) as item (item.secret.$loki)}
                  <div class="flex items-center gap-2 border-t border-border py-2">
                    <div class="min-w-0 flex-1">
                      {#if item.editing.key}
                        <input
                          class="w-full rounded-none border-b border-border bg-transparent font-mono text-sm text-text outline-none focus:border-accent"
                          type="text"
                          name="key"
                          defaultValue={item.secret.name}
                          onblur={(e) =>
                            e.currentTarget?.value?.length &&
                            updateItem(item.secret.$loki, {
                              key: e.currentTarget.value
                            })}
                          onkeydown={(e) => {
                            if (e.key === "Escape") item.editing.key = false;
                            else if (e.key === "Enter") {
                              e.currentTarget?.value?.length &&
                                updateItem(item.secret.$loki, {
                                  key: e.currentTarget.value
                                });
                            }
                          }}
                        />
                      {:else}
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                          class="truncate font-mono text-sm text-text"
                          ondblclick={async (e) => {
                            const parent = e.currentTarget.parentElement;
                            item.editing.key = true;
                            await tick();
                            parent?.querySelector("input")?.focus();
                            parent?.querySelector("input")?.select();
                          }}
                        >
                          {item.secret.name}
                        </div>
                      {/if}

                      {#if item.editing.value}
                        <input
                          class="mt-1 w-full rounded-none border-b border-border bg-transparent font-mono text-sm text-muted outline-none focus:border-accent"
                          type="text"
                          name="value"
                          defaultValue={item.secret.value}
                          onblur={(e) =>
                            e.currentTarget?.value?.length &&
                            updateItem(item.secret.$loki, {
                              value: e.currentTarget.value
                            })}
                          onkeydown={(e) => {
                            if (e.key === "Escape") item.editing.value = false;
                            else if (e.key === "Enter") {
                              e.currentTarget?.value?.length &&
                                updateItem(item.secret.$loki, {
                                  value: e.currentTarget.value
                                });
                            }
                          }}
                        />
                      {:else}
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                          class="mt-0.5 truncate font-mono text-xs text-muted"
                          ondblclick={async (e) => {
                            const parent = e.currentTarget.parentElement;
                            item.editing.value = true;
                            await tick();
                            parent?.querySelector("input")?.focus();
                            parent?.querySelector("input")?.select();
                          }}
                        >
                          {#if item.visible}
                            {item.secret.value}
                          {:else}
                            {"●".repeat(Math.min(item.secret.value.length, 24))}
                          {/if}
                        </div>
                      {/if}
                    </div>

                    <div class="flex shrink-0 items-center">
                      <IconButton
                        icon={Pencil}
                        onclick={async (e) => {
                          const parent = e.currentTarget.closest(".flex.items-center.gap-2");
                          item.editing.value = true;
                          await tick();
                          (parent?.querySelector('input[name="value"]') as HTMLInputElement | null)?.focus();
                        }}
                      />
                      <IconButton
                        icon={item.visible ? EyeOff : Eye}
                        onclick={() => (item.visible = !item.visible)}
                      />
                      <IconButton
                        icon={copiedId === item.secret.$loki ? Check : Copy}
                        onclick={() => copyValue(item)}
                      />
                      <IconButton
                        icon={Trash}
                        danger
                        onclick={() => deleteItem(item.secret.$loki)}
                      />
                    </div>
                  </div>
                {/each}
              </div>
            </Collapse>
          </section>
        {/if}
      {/each}
    </div>
  </div>
</main>
