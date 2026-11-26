import { cp, mkdir, rm } from "node:fs/promises";

await rm("public", { recursive: true, force: true });
await mkdir("public", { recursive: true });
await cp("index.html", "public/index.html");
await cp("elementary-lower.html", "public/elementary-lower.html");
for (const page of ["method", "class", "schedule", "director", "winter"]) {
  await cp(`${page}.html`, `public/${page}.html`);
}
await cp("assets", "public/assets", { recursive: true });
await cp("notices", "public/notices", { recursive: true });
await cp("admin", "public/admin", { recursive: true });
await cp("CNAME", "public/CNAME");
