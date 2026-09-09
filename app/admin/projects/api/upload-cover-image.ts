/**
 * `uploadCoverImage` — browser-only upload of a project cover image to
 * `POST /api/v1/uploads/cover-image`.
 *
 * Deliberately bypasses `clientFetch` (see `~/shared/lib/fetch-client`):
 * `core.ts`'s `composeHeaders` forces `Content-Type: application/json`
 * on any request with a body unless the caller supplies its own
 * `Content-Type` — but a `multipart/form-data` upload MUST let the
 * browser set `Content-Type` itself (it embeds the multipart boundary).
 * A raw `fetch` here keeps that contract intact while still attaching
 * the bearer token + credentials the way `client.ts` does.
 *
 * On success, returns the uploaded object's storage key (never a URL —
 * see the backend's `UploadsService` for why). On failure, throws an
 * `Error` with a user-facing message the caller can hand to `toast.error`.
 */
import { useSessionStore } from '~/shared/stores/session';

const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadCoverImage(file: File): Promise<{ key: string }> {
	if (!file.type.startsWith('image/')) {
		throw new Error('File must be an image');
	}
	if (file.size > MAX_COVER_IMAGE_BYTES) {
		throw new Error('File exceeds the 5MB size limit');
	}

	const accessToken = useSessionStore.getState().accessToken;
	const form = new FormData();
	form.set('file', file);

	let response: Response;
	try {
		response = await fetch('/api/v1/uploads/cover-image', {
			method: 'POST',
			body: form,
			credentials: 'include',
			headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
		});
	} catch {
		throw new Error('Network error while uploading the cover image');
	}

	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as
			| { message?: string }
			| null;
		throw new Error(body?.message ?? 'Cover image upload failed');
	}

	return (await response.json()) as { key: string };
}
