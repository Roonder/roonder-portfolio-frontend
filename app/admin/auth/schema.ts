/**
 * Shared zod schemas for the admin auth subdomain.
 *
 * `loginSchema` is the single source of truth for the login shape. The
 * form (T-L-4), the server action (T-L-3), and the API client all
 * import it; the contract is never re-declared. The `min(8)` on
 * `password` mirrors the backend's `LoginDto` `@MinLength(8)`
 * (see `../roonder-portfolio-backend/src/auth/dto/login.dto.ts`).
 *
 * `userSchema` mirrors the backend's `GET /api/v1/auth/profile`
 * response. `authResponseSchema` mirrors the `AuthResponseDto`
 * returned by `POST /auth/login` and `POST /auth/refresh`.
 */

import { z } from 'zod';

export const loginSchema = z.object({
	email: z.string().email('Invalid email'),
	password: z
		.string()
		.min(8, 'String must contain at least 8 character(s)'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const userSchema = z.object({
	id: z.string(),
	email: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
	accessToken: z.string(),
	expiresIn: z.number().int().positive(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
