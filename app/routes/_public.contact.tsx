import type { Route } from "./+types/_public.contact";

/**
 * Public contact form route.
 *
 * TODO action: validate the submitted form with zod and POST to the backend
 * contact endpoint. The page itself should use react-hook-form for client
 * validation; the action is the server-side final word.
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Contact — Roonder Portfolio" }];
}

export default function PublicContact() {
  return (
    <section>
      <h1>Contact (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/contact/</code>.</p>
    </section>
  );
}
