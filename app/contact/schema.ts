/**
 * `contactSchema` — the canonical zod schema for the contact form.
 *
 * Source of truth for both the client-side form (via `zodResolver`)
 * and the server action's input validation. Mirrors the backend's
 * locked `CreateContactDto` (`name` 1-100, `email`, `subject`
 * 1-150, `message` 1-5000). The backend's `forbidNonWhitelisted`
 * pipe rejects any extra field; the frontend MUST NOT add one.
 *
 * No other file declares a second copy of the contact form shape.
 * See `contact-domain` REQ-CON-1.
 */
import { z } from 'zod';

export const contactSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'contact.form.validation.nameMin')
		.max(80, 'contact.form.validation.nameMax'),
	email: z
		.string()
		.trim()
		.min(1, 'contact.form.validation.emailRequired')
		.email('contact.form.validation.emailInvalid'),
	subject: z
		.string()
		.trim()
		.min(2, 'contact.form.validation.subjectMin')
		.max(120, 'contact.form.validation.subjectMax'),
	message: z
		.string()
		.trim()
		.min(10, 'contact.form.validation.messageMin')
		.max(2000, 'contact.form.validation.messageMax'),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
