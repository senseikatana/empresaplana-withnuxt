<script setup lang="ts">
const open = defineModel<boolean>("open", { default: false });

defineProps<{
	previewUrl?: string | null;
	name?: string;
	loading?: boolean;
	error?: string | null;
}>();

const emit = defineEmits<{ confirm: []; cancel: [] }>();
const { t } = useI18n();
</script>

<template>
	<UModal
		v-model:open="open"
		:title="t('app.panel.avatarConfirmTitle')"
		:description="t('app.panel.avatarConfirmDesc')"
		:dismissible="!loading"
	>
		<template #body>
			<div class="flex flex-col items-center gap-4">
				<img
					v-if="previewUrl"
					:src="previewUrl"
					:alt="name || t('app.panel.avatar')"
					class="h-40 w-40 rounded-full object-cover ring-4 ring-primary/20"
				/>
				<UAlert v-if="error" color="error" variant="soft" :title="error" class="w-full" />
			</div>
		</template>
		<template #footer>
			<div class="flex w-full justify-end gap-2">
				<UButton color="neutral" variant="ghost" :disabled="loading" @click="emit('cancel')">
					{{ t("app.panel.cancel") }}
				</UButton>
				<UButton :loading="loading" @click="emit('confirm')">
					{{ t("app.panel.avatarConfirmOk") }}
				</UButton>
			</div>
		</template>
	</UModal>
</template>
