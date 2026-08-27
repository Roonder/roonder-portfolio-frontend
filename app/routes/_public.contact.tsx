import type { Route } from './+types/_public.contact';

import { ContactPage } from '~/contact/pages/contact';
import { contactSchema, type ContactFormValues } from '~/contact/schema';
import { submitContact } from '~/contact/api/contact';

/**
 * Public contact form route.
 *
 * Loader is a no-op per REQ-CON-8 (the form is the surface; no
 * prefetched data). Action validates with `contactSchema`
 * (REQ-CON-1 source of truth) and posts to `POST /api/v1/contacts`
 * (PLURAL, locked) via `submitContact`; on 201 returns `{ ok: true }`
 * so the form clears + pushes a localized toast; on any non-2xx
 * returns the typed `ApiError` from the locked `http-client`
 * REQ-CORE-2 envelope (REQ-CON-3, REQ-CON-4).
 */
export async function loader(_args: Route.LoaderArgs) {
	// REQ-CON-8: the loader is intentionally a no-op. Returning
	// the active locale keeps the type narrow and lets child
	// components read the same shape the public layout returns.
	return { ok: true } as const;
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const raw: Record<string, unknown> = {
		name: formData.get('name') ?? '',
		email: formData.get('email') ?? '',
		subject: formData.get('subject') ?? '',
		message: formData.get('message') ?? '',
	};
	const parsed = contactSchema.safeParse(raw);
	if (!parsed.success) {
		// Map zod field errors into the `validation` ApiError envelope.
		const fieldErrors: Record<string, string[]> = {};
		for (const issue of parsed.error.issues) {
			const path = issue.path.join('.') || '_';
			(fieldErrors[path] ??= []).push(issue.message);
		}
		return {
			ok: false as const,
			error: {
				kind: 'validation' as const,
				status: 400,
				message: 'Validation failed',
				fieldErrors,
			},
		};
	}

	const result = await submitContact(request, parsed.data as ContactFormValues);
	// The action returns the discriminated result shape so the
	// form can pattern-match on `data.error.kind` per the locked
	// http-client REQ-CORE-2 contract.
	return result;
}

export function meta({ params }: Route.MetaArgs) {
	const lang = (params as { lang?: string }).lang ?? 'en';
	const isEs = lang === 'es';
	const base = isEs ? '/es/contact' : '/contact';
	const origin = 'https://roonder.dev';
	const canonical = `${origin}${base}`;
	const altEn = `${origin}/contact`;
	const altEs = `${origin}/es/contact`;
	const title = isEs
		? 'Contacto — Roonder Portfolio'
		: 'Contact — Roonder Portfolio';
	const description = isEs
		? 'Ponte en contacto para consultas de proyectos, prensa o colaboraciones estratégicas.'
		: 'Get in touch for project inquiries, press, or strategic collaborations.';
	return [
		{ title },
		{ name: 'description', content: description },
		{ tagName: 'link', rel: 'canonical', href: canonical },
		{
			tagName: 'link',
			rel: 'alternate',
			hrefLang: 'en',
			href: altEn,
		},
		{
			tagName: 'link',
			rel: 'alternate',
			hrefLang: 'es',
			href: altEs,
		},
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:type', content: 'website' },
	];
}

export default function PublicContactRoute() {
	return <ContactPage />;
}
