/**
 * `ContactCTA` — the home contact CTA bento.
 *
 * Temporarily a `mailto:` CTA instead of the `ContactForm` molecule
 * while the Resend domain/sender verification is pending — email
 * delivery can't be trusted yet, so this routes visitors straight
 * to a personal inbox instead of a form that silently can't send.
 * `ContactForm` itself is untouched; swap this back once Resend is
 * configured (see `~/contact/molecules/contact-form`).
 *
 * BRAND FLOURISH — "CONTACTO" micro-label stays fixed per ADR-6.
 */
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";

import { cn } from "~/shared/lib/cn";

import { BentoCell } from "~/shared/ui/atoms/bento-cell";
import { MicroLabel } from "~/shared/ui/atoms/micro-label";
import { Button } from "~/components/ui/button";

const CONTACT_EMAIL = "apontejuliam@gmail.com";

export type ContactCTAProps = {
	className?: string;
};

export function ContactCTA({ className }: ContactCTAProps) {
	const { t } = useTranslation();

	return (
		<BentoCell variant="elevated" className={cn("flex flex-col gap-6 p-8 md:p-10", className)}>
			<header className="flex flex-col gap-2">
				<MicroLabel label="CONTACTO" />
				<h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
					{t("home.sections.contact.title")}
				</h2>
				<p className="text-sm text-muted-foreground md:text-base">
					{t("home.sections.contact.subtitle")}
				</p>
			</header>

			<div className="flex items-center gap-x-2">
				<Button
					size="lg"
					className="self-start"
					render={<a href={`mailto:${CONTACT_EMAIL}`} />}
				>
					<Mail className="mr-1.5 size-4" aria-hidden="true" />
					{t("home.sections.contact.cta")}
				</Button>
				<Button
					size="lg"
					className="self-start"
					variant={"secondary"}
					render={<a target="_blank" href={`https://cal.com/juliam-aponte/discovery`} />}
				>
					<Mail className="mr-1.5 size-4" aria-hidden="true" />
					{t("home.sections.contact.cal-cta")}
				</Button>
			</div>
		</BentoCell>
	);
}
