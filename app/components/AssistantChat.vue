<script setup lang="ts">
import { useChat } from "@ai-sdk/vue";
import { DefaultChatTransport, type UIMessage } from "ai";

const props = defineProps<{
	conversationId: string;
	initialMessages: UIMessage[];
}>();

const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();
const input = ref("");

const quickPrompts = computed(() => [
	t("app.assistant.suggestions.lines"),
	t("app.assistant.suggestions.fares"),
	t("app.assistant.suggestions.quote"),
]);

const { messages, status, error, sendMessage, stop } = useChat({
	id: props.conversationId,
	messages: props.initialMessages,
	transport: new DefaultChatTransport({
		api: `/api/dashboard/assistant/${props.conversationId}`,
	}),
	onFinish: () => emit("saved"),
});

const isStreaming = computed(() => status.value === "streaming");

function send(text: string) {
	const value = text.trim();
	if (!value || isStreaming.value) return;
	sendMessage({ text: value });
	input.value = "";
}

function handleSubmit(event: Event) {
	event.preventDefault();
	send(input.value);
}
</script>

<template>
	<div class="flex flex-col h-full min-h-0">
		<UChatMessages
			should-auto-scroll
			:messages="messages"
			:status="status"
			class="flex-1"
			:spacing-offset="180"
		>
			<template #content="{ message }">
				<template v-for="(part, index) in message.parts" :key="`${message.id}-${index}`">
					<AppMarkdown
						v-if="part.type === 'text' && message.role === 'assistant'"
						:value="part.text"
					/>
					<p v-else-if="part.type === 'text'" class="whitespace-pre-wrap">
						{{ part.text }}
					</p>
				</template>
			</template>

			<template #indicator>
				<UChatShimmer :text="t('app.assistant.thinking')" class="text-sm" />
			</template>
		</UChatMessages>

		<div v-if="!messages.length" class="flex flex-wrap gap-2 justify-center pb-4">
			<UButton
				v-for="prompt in quickPrompts"
				:key="prompt"
				:label="prompt"
				size="sm"
				color="neutral"
				variant="outline"
				class="rounded-full"
				@click="send(prompt)"
			/>
		</div>

		<UAlert
			v-if="error"
			color="error"
			variant="soft"
			:title="error.message"
			class="mb-3"
		/>

		<UChatPrompt
			v-model="input"
			:status="status"
			:placeholder="t('app.assistant.placeholder')"
			class="sticky bottom-0"
			@submit="handleSubmit"
		>
			<UChatPromptSubmit :status="status" @stop="stop" />
		</UChatPrompt>
	</div>
</template>
