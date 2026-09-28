export function useDashboard() {
	const isNotificationsSlideoverOpen = useState(
		"dashboard-notifications-open",
		() => false,
	);
	const isCommandPaletteOpen = useState(
		"dashboard-command-palette-open",
		() => false,
	);

	return {
		isNotificationsSlideoverOpen,
		toggleNotifications() {
			isNotificationsSlideoverOpen.value = !isNotificationsSlideoverOpen.value;
		},
		closeNotifications() {
			isNotificationsSlideoverOpen.value = false;
		},
		isCommandPaletteOpen,
		toggleCommandPalette() {
			isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
		},
		closeCommandPalette() {
			isCommandPaletteOpen.value = false;
		},
	};
}
