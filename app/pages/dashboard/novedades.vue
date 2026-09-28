<script setup lang="ts">
import changelogRaw from "../../../CHANGELOG.md?raw";

definePageMeta({
	layout: "dashboard",
	capability: "dashboard:access",
});

const { t } = useI18n();

useHead({ title: () => t("releases.title") });

type Version = { version: string; date: string; markdown: string };

function parseChangelog(raw: string): Version[] {
	const versions: Version[] = [];
	let current: Version | null = null;
	let body: string[] = [];

	const flush = () => {
		if (current) {
			current.markdown = body.join("\n").trim();
			versions.push(current);
		}
		body = [];
	};

	for (const line of raw.split("\n")) {
		const heading = /^##\s+\[([^\]]+)\]\s*-\s*(\S+)/.exec(line);
		if (heading) {
			flush();
			current = {
				version: heading[1] ?? "",
				date: heading[2] ?? "",
				markdown: "",
			};
			continue;
		}
		if (current) body.push(line);
	}
	flush();
	return versions;
}

const versions = computed(() => parseChangelog(changelogRaw));
</script>

<template>
	<div class="max-w-3xl">
		<p class="mb-8 text-body-md text-on-surface-variant">{{ t("releases.subtitle") }}</p>

		<UChangelogVersions
			as="div"
			:indicator-motion="false"
			:ui="{ root: 'py-2', indicator: 'inset-y-0' }"
		>
			<UChangelogVersion
				v-for="version in versions"
				:key="version.version"
				:title="`v${version.version}`"
				:date="version.date"
				:to="`https://github.com/senseikatana/empresaplana-withnuxt/releases/tag/v${version.version}`"
				target="_blank"
				:ui="{
					root: 'flex items-start',
					container: 'max-w-xl min-w-0',
					header: 'border-b border-default pb-4',
					title: 'text-2xl',
					date: 'text-xs/9 text-highlighted font-mono',
				}"
			>
				<template #body>
					<AppMarkdown v-if="version.markdown" :value="version.markdown" />
				</template>
			</UChangelogVersion>
		</UChangelogVersions>

		<p class="pt-8 text-xs text-muted italic">{{ t("releases.source") }}</p>
	</div>
</template>
