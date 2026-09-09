# contact-domain — Locked Spec

> Status: **locked** (promoted from `portfolio-frontend-v1` delta, archived 2026-08-27).
> Capability: `contact-domain`.
> Source of truth: `openspec/changes/portfolio-frontend-v1/proposal.md` (corrected) §Approach "Home contact form is a real form" + the backend contract at `../roonder-portfolio-backend/openspec/changes/domain-contact/specs/contact/spec.md`.
> Consumed locked specs: `openspec/specs/http-client/spec.md` (REQ-CORE-2 error envelope, REQ-SVR-1/REQ-SVR-2/REQ-SRV-3 server fetch, REQ-CLI-1/REQ-CLI-2 client fetch, REQ-SWR-1/REQ-SWR-2).
> Cross-references: backend `../roonder-portfolio-backend/openspec/changes/domain-contact/specs/contact/spec.md` (the locked public `POST /api/v1/contacts` contract — the canonical source of truth for the DTO shape, the 201 response, and the throttling policy).

## Purpose

The public contact route at `/contact` (and `/es/contact`) hosts a real form. Today `app/routes/_public.contact.tsx` is a 21-line scaffold. This delta fills it with a real form (name, email, subject, message), validates it client-side with `react-hook-form` + `zodResolver`, and submits it through a server `action` to the backend's `POST /api/v1/contacts` endpoint. The SAME schema and the SAME form molecule are consumed by `home-domain` (the home contact form, per the proposal §Approach "Home contact form is a real form" and `home-domain` REQ-HOME-6). This spec is the source of truth for the form schema, the action, and the throttling handling. The `home-domain` spec references these by ID.

> **DRIFT NOTE (proposal → backend) — RESOLVED 2026-08-26**: the proposal originally referenced `POST /api/v1/contact` (singular); the backend's `contact-domain` change at `../roonder-portfolio-backend/openspec/changes/domain-contact/specs/contact/spec.md` Requirement: Public POST contact endpoint locks the path as **`POST /api/v1/contacts`** (plural). The proposal has been corrected to match the locked plural form. The design phase MUST use the plural.

## Requirements

### REQ-CON-1: Contact form schema (source of truth)

The system SHALL declare the contact form zod schema at `app/contact/schema.ts` as:

```text
name    : z.string().min(1).max(100)
email   : z.string().email()
subject : z.string().min(1).max(150)
message : z.string().min(1).max(5000)
```

The schema MUST be the single source of truth for both the client-side form (via `zodResolver`) and the server action's input validation. No other file SHALL declare a second copy of the contact form shape. The inferred TypeScript type `ContactFormValues = z.infer<typeof contactSchema>` is exported and used by both the form molecule and the action.

> **NOTE**: the `contactSchema` field set (name, email, subject, message — 4 fields, no `phone`, no `company`, no `attachments`) mirrors the backend's `CreateContactDto` per the locked `contact-domain` Requirement: Contact form DTO validation. The backend's `forbidNonWhitelisted: true` REJECTS any extra field; the frontend MUST NOT add a `phone` or `company` field to the form.

#### Scenario: Client-side validation blocks a missing field

- GIVEN the user leaves `name` empty
- WHEN the form validates (on submit OR on blur, per `react-hook-form` mode)
- THEN the `name` field shows the zod message `String must contain at least 1 character(s)` AND the form does NOT submit

#### Scenario: Client-side validation blocks a bad email

- GIVEN the user types `not-an-email`
- WHEN the form validates
- THEN the `email` field shows `Invalid email` AND the form does NOT submit

#### Scenario: Schema rejects a too-long message

- GIVEN the user types more than 5000 characters in `message`
- WHEN the form validates
- THEN the `message` field shows the zod max-length message AND the form does NOT submit

### REQ-CON-2: Contact form molecule (reused by home and /contact)

The system SHALL provide a `ContactForm` molecule at `app/contact/molecules/contact-form.tsx` that consumes `contactSchema` (REQ-CON-1), wires `useForm` + `zodResolver(contactSchema)`, renders four `Field` rows (name, email, subject, message — `message` is a `Textarea`), and submits via `useFetcher().submit(values, { method: 'post', action: '/contact' })` (the `/contact` route's `action` per REQ-CON-3). The molecule is the SAME one used by `home-domain`'s `HomeContactForm` (per `home-domain` REQ-HOME-6); no second copy.

#### Scenario: The molecule renders the four fields in the right order

- GIVEN the `ContactForm` molecule mounts
- WHEN it renders
- THEN the field order is `name`, `email`, `subject`, `message` AND each field shows its label and placeholder via `t('contact.form.*')` from the `contact` i18n namespace AND no English string is hardcoded in the JSX

#### Scenario: Pending state disables the submit

- GIVEN the user clicks `Send Transmission` (or `Enviar Mensaje` in `es`)
- WHEN the fetcher is in flight (`fetcher.state === 'submitting'`)
- THEN the submit button is disabled AND shows a spinner (per the shadcn `Button` pending state)

### REQ-CON-3: Contact route action posts to `/api/v1/contacts`

The system SHALL export a `action` from `app/routes/_public.contact.tsx` that: (1) parses the `FormData`; (2) validates the payload with `contactSchema` (REQ-CON-1) — on parse failure, returns a typed `validation` `ApiError`; (3) calls `serverFetch('POST /api/v1/contacts', { body: parsed })` (the locked plural path per the backend's `contact-domain` Requirement: Public POST contact endpoint); (4) on 201, returns `{ ok: true }` so the form clears AND `useToastStore.push({ kind: 'success', message: t('contact.form.success') })` fires; (5) on 429, returns the typed `throttled` `ApiError` so the form renders the countdown (per REQ-CON-5); (6) on any other non-2xx, returns the typed `ApiError` per locked `http-client` REQ-CORE-2.

> **DRIFT NOTE (proposal → backend)**: the proposal text says `POST /api/v1/contact` (singular). The backend's locked `contact-domain` Requirement: Public POST contact endpoint declares the path as `POST /api/v1/contacts` (plural). The frontend MUST use the plural. The design phase flags the drift.

#### Scenario: Happy path returns 201 and the form clears

- GIVEN the user submits `{ name, email, subject, message }`
- WHEN the backend returns 201
- THEN the action returns `{ ok: true }` AND the form fields are reset AND a success toast is pushed

#### Scenario: 400 with field errors surfaces them under each field

- GIVEN the backend returns 400 with
  `{ message: ['email must be an email', 'name should not be empty'] }`
- WHEN the action returns
- THEN the form shows the message under `email` and `name` respectively (per locked `http-client` REQ-ERR-2)

### REQ-CON-4: Same error envelope contract as the home contact form

The system SHALL consume the same error rendering the home contact form uses (per `home-domain` REQ-HOME-6). The discriminated `ApiError` from locked `http-client` REQ-CORE-2 is the single source of truth: `validation` → per-field errors; `throttled` → retry-after countdown; `network` → retry button; `server` → generic error with a retry.

#### Scenario: Validation, throttled, and network errors are distinct in the UI

- GIVEN the action returns a typed `ApiError`
- WHEN the form renders
- THEN the UI is determined by the `kind` field (per locked `http-client` REQ-CORE-2) AND the same `<FormError />` atom used by the home contact form renders the right branch

### REQ-CON-5: Throttling (429) handled inline

The system SHALL render the 429 case inline in the form (not as a toast). On `ApiError { kind: 'throttled', retryAfter: <seconds> }`, the form MUST show the message from `t('contact.form.throttled', { seconds: retryAfter })` under the submit button AND MUST disable the submit button until the countdown elapses.

#### Scenario: 429 with `Retry-After: 12` shows a 12-second countdown

- GIVEN the backend returns 429 with `Retry-After: 12`
- WHEN the form renders the error
- THEN the inline message reads `Too many submissions. Try again in 12 seconds.` AND the submit button is disabled for 12 seconds

#### Scenario: 429 with no `Retry-After` header falls back to a default

- GIVEN the backend returns 429 with no `Retry-After` header
- WHEN the form renders the error
- THEN `retryAfter` is `undefined` (per locked `http-client` REQ-ERR-3) AND the form shows a generic "Please wait a moment and try again." message

### REQ-CON-6: Success toast is localized

The system SHALL push a success toast via `useToastStore.push({ kind: 'success', message: t('contact.form.success') })` on a 201 response. The toast text MUST come from the `contact` i18n namespace, not from a hardcoded English string.

#### Scenario: en success toast

- GIVEN the `en` locale is active
- WHEN the action returns 201
- THEN the toast reads `Message sent` (the `contact.form.success` value in `app/shared/i18n/locales/en/contact.json`)

#### Scenario: es success toast

- GIVEN the `es` locale is active
- WHEN the action returns 201
- THEN the toast reads `Mensaje enviado` (the `contact.form.success` value in `app/shared/i18n/locales/es/contact.json`)

### REQ-CON-7: Meta tags and hreflang for en/es

The system SHALL export a `meta()` function from `app/routes/_public.contact.tsx` that returns: a `title` (per locale: `Contact — Roonder Portfolio` / `Contacto — Roonder Portfolio`); a `description` (per locale, sourced from `contact.meta.description`); a `link rel="canonical"` pointing to the current URL in the active locale; and `link rel="alternate" hreflang="en"` and `hreflang="es"` entries pointing to the same page in the other locale.

#### Scenario: en contact advertises the es alternate

- GIVEN the URL is `/contact`
- WHEN the page renders
- THEN the `<head>` contains `<link rel="canonical" href="https://…/contact">` AND `<link rel="alternate" hreflang="es" href="https://…/es/contact">`

#### Scenario: es contact canonicalizes to itself and alternates to en

- GIVEN the URL is `/es/contact`
- WHEN the page renders
- THEN the canonical link is `https://…/es/contact` AND the `<link rel="alternate" hreflang="en">` points to `https://…/contact`

### REQ-CON-8: /contact loader is a no-op (the form is the surface)

The system SHALL provide a no-op `loader` at `app/routes/_public.contact.tsx` (returns `{}` or a typed empty payload). The contact form fetches no data on mount; the route's purpose IS the form. The loader exists only to make the route file a valid React Router route module.

#### Scenario: Loader returns an empty payload

- GIVEN the user navigates to `/contact`
- WHEN the loader runs
- THEN it returns `{}` (or `{ lang: <active-locale> }` for symmetry with `_public.tsx`) AND no network call is made

## Cross-references

- **Locked frontend** (consumed, not modified): `openspec/specs/http-client/spec.md` (REQ-CORE-1, REQ-CORE-2, REQ-ERR-1, REQ-ERR-2, REQ-ERR-3, REQ-SRV-1, REQ-SRV-2, REQ-SRV-3, REQ-CLI-1, REQ-CLI-2, REQ-SWR-1, REQ-SWR-2).
- **Backend** (read-only, mirror the contract): `../roonder-portfolio-backend/openspec/changes/domain-contact/specs/contact/spec.md`:
  - Requirement: Public POST contact endpoint — `POST /api/v1/contacts` (PLURAL), throttled per-IP, public (no auth), 201 on success.
  - Requirement: Contact form DTO validation — exactly 4 fields: `name` (1–100), `email` (email), `subject` (1–150), `message` (1–5000); `forbidNonWhitelisted` rejects extra fields.
- **Sibling capability** (consumed, not modified): `home-domain` REQ-HOME-6 — the home contact form reuses the same `ContactForm` molecule and the same action.
- **i18n keys**: `contact.form.*` (name, email, subject, message, submit, success, throttled), `contact.meta.*` (title, description).
- **Proposal**: `openspec/changes/portfolio-frontend-v1/proposal.md` §Capabilities "contact-domain" + Q-7 disposition (real form, not CTA).

## Out of scope

- **An admin inbox.** The admin reviews the contact submissions via a separate surface; the inbox (`/admin/contact`) is deferred (per Q-3 / Q-20 disposition; reviews + contact inbox are out of scope for v1). The `app/routes/admin.contact*` files stay as TODO scaffolds.
- **Attachment uploads.** The backend DTO forbids extra fields; the form has no attachment input.
- **Honeypot / reCAPTCHA / rate-limiting on the frontend.** The backend's `@Throttle()` per-IP guard is the single source of throttling. Adding a frontend guard (CAPTCHA, etc.) is a future change.
- **A spam filter / moderation step.** Out of scope; the backend accepts the message and persists it.
- **Pre-render target decision (Q-21).** Deferred to a follow-up SDD change. P1 ships with SSR.
