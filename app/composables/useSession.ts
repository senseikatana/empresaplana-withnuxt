export type SessionUser = {
	id: number;
	username: string;
	name: string;
	email: string;
	role: string;
	emailVerified: boolean;
	hasAvatar: boolean;
	avatarVersion: number;
};

/**
 * Shared, SSR-safe session state. One `/api/me` fetch per request/render,
 * reused by the dashboard layout, pages and guards.
 */
export function useSession() {
	const user = useState<SessionUser | null>("session-user", () => null);
	const loaded = useState<boolean>("session-loaded", () => false);

	async function ensureSession(force = false): Promise<SessionUser | null> {
		if (loaded.value && !force) return user.value;
		try {
			const data = await $fetch<{ user: SessionUser }>("/api/me", {
				headers: useRequestHeaders(["cookie"]),
			});
			user.value = data.user;
		} catch {
			user.value = null;
		}
		loaded.value = true;
		return user.value;
	}

	async function refresh(): Promise<SessionUser | null> {
		return ensureSession(true);
	}

	function clear(): void {
		user.value = null;
		loaded.value = false;
	}

	return { user, loaded, ensureSession, refresh, clear };
}
