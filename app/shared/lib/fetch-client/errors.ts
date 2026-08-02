/**
 * The single error type every consumer pattern-matches on.
 *
 * Built as a const-object + index type (per the `typescript` skill) so
 * adding a new `ApiErrorKind` is a one-line edit and the compiler
 * re-checks every `switch (err.kind)`. The class extends `Error` so
 * `Error.cause` chaining and stack traces survive, but the runtime
 * discriminator is `kind`, not `instanceof`.
 */

/**
 * All possible error kinds. The const-object pattern (vs a direct union
 * type) means both the runtime values and the type live in one place;
 * consumers do `case API_ERROR_KIND.unauthorized:` for exhaustiveness.
 */
export const API_ERROR_KIND = {
	unauthorized: 'unauthorized',
	forbidden: 'forbidden',
	notFound: 'notFound',
	conflict: 'conflict',
	throttled: 'throttled',
	validation: 'validation',
	server: 'server',
	network: 'network',
} as const;

export type ApiErrorKind =
	(typeof API_ERROR_KIND)[keyof typeof API_ERROR_KIND];

/**
 * Per-kind payload map. `validation` carries `fieldErrors` (required);
 * `throttled` carries optional `retryAfter`; the rest carry only the
 * human message. The union lets the consumer narrow with
 * `switch (err.kind)` without re-declaring which fields belong to which
 * branch.
 */
export type ApiErrorPayload =
	| { kind: 'unauthorized'; status: number; message: string }
	| { kind: 'forbidden'; status: number; message: string }
	| { kind: 'notFound'; status: number; message: string }
	| { kind: 'conflict'; status: number; message: string }
	| {
			kind: 'throttled';
			status: number;
			message: string;
			retryAfter?: number;
	  }
	| {
			kind: 'validation';
			status: number;
			message: string;
			fieldErrors: Record<string, string[]>;
	  }
	| { kind: 'server'; status: number; message: string }
	| { kind: 'network'; status: number; message: string };

export class ApiError extends Error {
	readonly kind: ApiErrorKind;
	readonly status: number;
	readonly fieldErrors?: Record<string, string[]>;
	readonly retryAfter?: number;
	readonly cause?: unknown;

	constructor(p: ApiErrorPayload, cause?: unknown) {
		super(p.message);
		this.name = 'ApiError';
		this.kind = p.kind;
		this.status = p.status;
		this.cause = cause;
		if (p.kind === 'validation') {
			this.fieldErrors = p.fieldErrors;
		}
		if (p.kind === 'throttled' && p.retryAfter !== undefined) {
			this.retryAfter = p.retryAfter;
		}
	}

	/**
	 * Serialize for transport (e.g. through `fetcher.data` to the form
	 * layer). Reconstructs the per-kind fields so the form can
	 * pattern-match on the wire shape.
	 */
	toJSON(): {
		kind: ApiErrorKind;
		status: number;
		message: string;
		fieldErrors?: Record<string, string[]>;
		retryAfter?: number;
	} {
		return {
			kind: this.kind,
			status: this.status,
			message: this.message,
			...(this.fieldErrors !== undefined
				? { fieldErrors: this.fieldErrors }
				: {}),
			...(this.retryAfter !== undefined
				? { retryAfter: this.retryAfter }
				: {}),
		};
	}
}

/**
 * Map a non-2xx `Response` + its parsed body to an `ApiError`. The
 * body is the backend's canonical envelope:
 *   `{ statusCode, error, message, timestamp, path }`
 * per `openspec/specs/global-exception-filter` on the sibling backend.
 *
 * - `message` is `string[]` → `validation` (per-field flattened)
 * - `Retry-After` header present + 429 → `throttled` with `retryAfter`
 * - status fallback: 401 → unauthorized, 403 → forbidden, 404 → notFound,
 *   409 → conflict, 4xx → validation, 5xx → server
 */
export function fromResponse(res: Response, body: unknown): ApiError {
	const status = res.status;
	const env = isErrorEnvelope(body) ? body : null;
	const message = env ? firstMessage(env.message) : res.statusText || 'Request failed';

	if (status === 429) {
		const retryAfter = parseRetryAfter(res.headers.get('Retry-After'));
		return new ApiError(
			retryAfter !== undefined
				? { kind: 'throttled', status, message, retryAfter }
				: { kind: 'throttled', status, message },
		);
	}

	if (status === 400 && env && Array.isArray(env.message)) {
		return new ApiError({
			kind: 'validation',
			status,
			message,
			fieldErrors: flattenValidationMessages(env.message as string[]),
		});
	}

	switch (status) {
		case 401:
			return new ApiError({ kind: 'unauthorized', status, message });
		case 403:
			return new ApiError({ kind: 'forbidden', status, message });
		case 404:
			return new ApiError({ kind: 'notFound', status, message });
		case 409:
			return new ApiError({ kind: 'conflict', status, message });
		case 400:
			// 400 with non-array message — surface as validation so the
			// form layer can still render a per-field error path.
			return new ApiError({
				kind: 'validation',
				status,
				message,
				fieldErrors: {},
			});
		default:
			if (status >= 500) {
				return new ApiError({ kind: 'server', status, message });
			}
			return new ApiError({ kind: 'server', status, message });
	}
}

/**
 * Map a thrown `fetch` error (network failure, AbortError, CORS) to an
 * `ApiError`. The `kind` is always `network`; the `cause` is the
 * original error for diagnostics.
 */
export function fromNetwork(err: unknown): ApiError {
	const message = err instanceof Error ? err.message : 'Network error';
	return new ApiError(
		{ kind: 'network', status: 0, message: 'Network error' },
		err,
	);
}

// --- internal helpers -------------------------------------------------------

type ErrorEnvelope = {
	statusCode: number;
	error?: string;
	message: string | string[];
	timestamp?: string;
	path?: string;
};

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.statusCode === 'number' &&
		(typeof v.message === 'string' || Array.isArray(v.message))
	);
}

function firstMessage(message: string | string[]): string {
	if (Array.isArray(message)) return message[0] ?? 'Validation failed';
	return message;
}

function parseRetryAfter(header: string | null): number | undefined {
	if (!header) return undefined;
	const n = Number.parseInt(header, 10);
	return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Flatten NestJS ValidationPipe messages into a per-field map.
 *
 * The backend's pipes emit strings like `'email must be an email'` and
 * `'password must be longer than or equal to 8'`. We split on the first
 * space: the leading token is the field name (camelCase or nested path
 * with `.`), the remainder is the message. The map's keys are dot-path
 * for nested forms (`items.0.title`).
 */
function flattenValidationMessages(
	messages: string[],
): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	for (const raw of messages) {
		const space = raw.indexOf(' ');
		if (space === -1) {
			append(out, '_', raw);
			continue;
		}
		const field = raw.slice(0, space);
		const rest = raw.slice(space + 1).trim();
		append(out, field, rest || raw);
	}
	return out;
}

function append(map: Record<string, string[]>, key: string, value: string): void {
	const existing = map[key];
	if (existing) existing.push(value);
	else map[key] = [value];
}
