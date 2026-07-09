import type { Route } from "./+types/admin.contact._index";

/**
 * Admin contact inbox list route.
 *
 * TODO loader: fetch messages from `/api/v1/contact-messages` (or the
 * appropriate endpoint once the backend contract is confirmed).
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Messages — Admin" }];
}

export default function AdminContactList() {
  return (
    <section>
      <h1>Messages (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/contact/</code>.</p>
    </section>
  );
}
