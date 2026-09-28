<script setup lang="ts">
import changelogRaw from "../../CHANGELOG.md?raw";

const { t } = useI18n();

useHead({ title: () => t("releases.title") });
useSeoMeta({ description: () => t("releases.subtitle") });

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
	<div>
		<section class="w-full py-14 md:py-20 px-margin-mobile md:px-margin-desktop bg-surface-container-low border-b border-outline-variant/30">
			<div class="max-w-3xl mx-auto text-center">
				<span class="material-symbols-outlined text-deep-navy text-[40px] mb-3">history</span>
				<h1 class="font-display-lg text-display-lg md:text-[56px] leading-tight font-bold text-deep-navy">{{ t("releases.title") }}</h1>
				<p class="font-body-lg text-body-lg text-on-surface-variant mt-4">{{ t("releases.subtitle") }}</p>
			</div>
		</section>

		<UChangelogVersions
			as="main"
			:indicator-motion="false"
			:ui="{ root: 'py-10 sm:py-14', indicator: 'inset-y-0' }"
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
					title: 'text-3xl',
					date: 'text-xs/9 text-highlighted font-mono',
				}"
			>
				<template #body>
					<AppMarkdown v-if="version.markdown" :value="version.markdown" />
				</template>
			</UChangelogVersion>
		</UChangelogVersions>

		<div class="pb-16 flex flex-col items-center gap-2">
			<p class="text-xs text-outline italic text-center">{{ t("releases.source") }}</p>
		</div>
	</div>
</template>
