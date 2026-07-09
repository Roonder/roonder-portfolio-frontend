import type { Route } from "./+types/_public._index";

/**
 * Public home route.
 *
 * This route module is a CONTAINER. Page UI lives in `app/home/pages/home`.
 * When the page is built, import and render it here.
 */
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Home — Roonder Portfolio" },
    { name: "description", content: "Portfolio home" },
  ];
}

export default function PublicHome() {
  return (
    <section>
      <h1>Home (scaffold)</h1>
      <p>TODO: replace with the real page from <code>app/home/</code>.</p>
    </section>
  );
}
