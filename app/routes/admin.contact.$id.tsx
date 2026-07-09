import type { Route } from "./+types/admin.contact.$id";

/**
 * Admin contact message detail route.
 *
 * TODO loader: fetch a single message by `params.id`.
 * TODO action: mark as read or replied (state-change endpoint).
 */
export function meta({}: Route.MetaArgs) {
  return [{ title: "Message — Admin" }];
}

export default function AdminContactDetail({ params }: Route.ComponentProps) {
  return (
    <section>
      <h1>Message (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/admin/contact/</code>.</p>
      <p>id: {params.id}</p>
    </section>
  );
}
