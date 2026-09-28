<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";
import type { UIMessage } from "ai";

definePageMeta({ layout: "dashboard", capability: "chat:access" });

const { t } = useI18n();

type Conversation = {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
};

const { data, refresh } = await useFetch<{ conversations: Conversation[] }>(
	"/api/dashboard/assistant",
	{ headers: useRequestHeaders(["cookie"]), default: () => ({ conversations: [] }) },
);

const conversations = computed(() => data.value?.conversations ?? []);
const activeId = ref<string>(conversations.value[0]?.id ?? "");
const initialMessages = ref<UIMessage[]>([]);
const loading = ref(false);

async function loadConversation(id: string) {
	if (!id) {
		initialMessages.value = [];
		return;
	}
	loading.value = true;
	try {
		const payload = await $fetch<{ messages: UIMessage[] }>(
			`/api/dashboard/assistant/${id}`,
		);
		initialMessages.value = payload.messages;
	} finally {
		loading.value = false;
	}
}

async function newConversation() {
	const { conversation } = await $fetch<{ conversation: Conversation }>(
		"/api/dashboard/assistant",
		{ method: "POST" },
	);
	await refresh();
	activeId.value = conversation.id;
	initialMessages.value = [];
}

async function selectConversation(id: string) {
	if (id === activeId.value) return;
	activeId.value = id;
	await loadConversation(id);
}

if (activeId.value) {
	await loadConversation(activeId.value);
}

onMounted(async () => {
	if (!activeId.value) await newConversation();
});

const menuItems = computed<DropdownMenuItem[][]>(() => [
	[
		{
			label: t("app.assistant.new"),
			icon: "i-lucide-plus",
			onSelect: () => {
				void newConversation();
			},
		},
	],
	[
		...conversations.value.map((conversation) => ({
			label: conversation.title || t("app.assistant.untitled"),
			icon:
				conversation.id === activeId.value
					? ("i-lucide-message-circle" as const)
					: ("i-lucide-message-square" as const),
			checked: conversation.id === activeId.value,
			type: "checkbox" as const,
			onSelect: (event: Event) => {
				event.preventDefault();
				void selectConversation(conversation.id);
			},
		})),
	],
]);
</script>

<template>
	<div class="flex flex-col h-full min-h-[70vh] max-w-4xl mx-auto">
		<div class="flex items-center justify-between gap-3 pb-3">
			<div>
				<h1 class="text-xl font-bold text-highlighted">{{ t("app.assistant.title") }}</h1>
				<p class="text-sm text-muted">{{ t("app.assistant.subtitle") }}</p>
			</div>
			<UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
				<UButton
					:label="t('app.assistant.conversations')"
					icon="i-lucide-history"
					trailing-icon="i-lucide-chevron-down"
					color="neutral"
					variant="outline"
				/>
			</UDropdownMenu>
		</div>

		<div v-if="loading" class="flex-1 flex items-center justify-center text-muted">
			<span class="i-lucide-loader-circle animate-spin text-2xl" />
		</div>

		<AssistantChat
			v-else-if="activeId"
			:key="activeId"
			:conversation-id="activeId"
			:initial-messages="initialMessages"
			class="flex-1"
			@saved="refresh"
		/>
	</div>
</template>
