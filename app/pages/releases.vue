<script setup lang="ts">
import changelogRaw from "../../CHANGELOG.md?raw";

const { t } = useI18n();
const localePath = useLocalePath();

useHead({ title: () => t("releases.title") });
useSeoMeta({ description: () => t("releases.subtitle") });

type ReleaseSection = { kind: string; items: string[] };
type Release = { version: string; date: string; sections: ReleaseSection[] };

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function renderInline(value: string): string {
	return escapeHtml(value)
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(
			/\[([^\]]+)\]\(([^)]+)\)/g,
			'<a class="underline" href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
		)
		.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function parseChangelog(raw: string): Release[] {
	const releases: Release[] = [];
	let current: Release | null = null;
	let section: ReleaseSection | null = null;
	for (const line of raw.split("\n")) {
		const versionMatch = /^##\s+\[([^\]]+)\]\s*-\s*(\S+)/.exec(line);
		if (versionMatch) {
			current = {
				version: versionMatch[1] ?? "",
				date: versionMatch[2] ?? "",
				sections: [],
			};
			releases.push(current);
			section = null;
			continue;
		}
		if (!current) continue;
		const sectionMatch = /^###\s+(.+)/.exec(line);
		if (sectionMatch) {
			section = {
				kind: (sectionMatch[1] ?? "").trim().toLowerCase(),
				items: [],
			};
			current.sections.push(section);
			continue;
		}
		const itemMatch = /^[-*]\s+(.+)/.exec(line);
		if (itemMatch && section) section.items.push((itemMatch[1] ?? "").trim());
	}
	return releases;
}

const releases = computed(() => parseChangelog(changelogRaw));

const kindIcons: Record<string, string> = {
	added: "add_circle",
	changed: "sync",
	fixed: "build",
	removed: "delete",
	deprecated: "warning",
	security: "security",
};

function kindLabel(kind: string): string {
	const known = ["added", "changed", "fixed", "removed"];
	if (known.includes(kind)) return t(`releases.${kind}`);
	return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function kindIcon(kind: string): string {
	return kindIcons[kind] ?? "label";
}
</script>

<template>
	<div>
		<section class="w-full py-16 md:py-20 px-margin-mobile md:px-margin-desktop bg-surface-container-low border-b border-outline-variant/30">
			<div class="max-w-3xl mx-auto text-center">
				<span class="material-symbols-outlined text-deep-navy text-[40px] mb-3">history</span>
				<h1 class="font-display-lg text-display-lg md:text-[56px] leading-tight font-bold text-deep-navy">{{ t("releases.title") }}</h1>
				<p class="font-body-lg text-body-lg text-on-surface-variant mt-4">{{ t("releases.subtitle") }}</p>
			</div>
		</section>

		<section class="w-full py-16 px-margin-mobile md:px-margin-desktop bg-surface-container-lowest">
			<div class="max-w-3xl mx-auto">
				<p v-if="!releases.length" class="text-center text-on-surface-variant">{{ t("releases.empty") }}</p>

				<ol v-else class="relative border-l-2 border-outline-variant/50 pl-6 md:pl-8 flex flex-col gap-12">
					<li v-for="release in releases" :key="release.version" class="relative">
						<span class="absolute -left-[31px] md:-left-[39px] top-1 w-4 h-4 rounded-full bg-coastal-teal border-4 border-surface-container-lowest"></span>

						<div class="flex flex-wrap items-center gap-3 mb-4">
							<span class="inline-flex items-center rounded-lg bg-deep-navy text-on-primary font-label-md text-label-md px-3 py-1.5">v{{ release.version }}</span>
							<span class="font-body-md text-body-md text-on-surface-variant">{{ release.date }}</span>
							<a
								class="ml-auto text-sm text-deep-navy underline inline-flex items-center gap-1"
								:href="`https://github.com/senseikatana/empresaplana-withnuxt/releases/tag/v${release.version}`"
								target="_blank"
								rel="noopener noreferrer"
							>
								<span class="material-symbols-outlined text-[16px]">open_in_new</span>
								{{ t("releases.viewOnGithub") }}
							</a>
						</div>

						<div class="flex flex-col gap-5">
							<div v-for="section in release.sections" :key="`${release.version}-${section.kind}`">
								<h3 class="font-label-md text-label-md uppercase tracking-wider text-deep-navy flex items-center gap-2 mb-2">
									<span class="material-symbols-outlined text-[18px] text-coastal-teal">{{ kindIcon(section.kind) }}</span>
									{{ kindLabel(section.kind) }}
								</h3>
								<ul class="flex flex-col gap-2">
									<li v-for="(item, i) in section.items" :key="i" class="flex gap-2 font-body-md text-body-md text-on-surface-variant">
										<span class="text-outline select-none">•</span>
										<span v-html="renderInline(item)" />
									</li>
								</ul>
							</div>
						</div>
					</li>
				</ol>

				<div class="mt-14 flex flex-col items-center gap-3">
					<p class="text-xs text-outline italic text-center">{{ t("releases.source") }}</p>
					<a class="inline-flex items-center gap-2 text-deep-navy font-button text-button underline" :href="localePath('/')">
						<span class="material-symbols-outlined text-[18px]">arrow_back</span>
						{{ t("common.brand") }}
					</a>
				</div>
			</div>
		</section>
	</div>
</template>
