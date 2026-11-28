import linksByPath from "../client/src/content/papa-topic-links.json" with { type: "json" };

export function renderPapaTopicLinks(pathname, escapeHtml) {
  const topic = linksByPath[pathname];
  if (!topic) return "";
  const link = ([href, label]) => '<a href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a>';
  const breadcrumbs = topic.hub
    ? '<nav aria-label="Breadcrumb"><a href="/">Home</a> / ' + link(topic.hub) + ' / ' + escapeHtml(topic.title) + '</nav>'
    : "";
  return breadcrumbs + '<section aria-label="Related Papa Life pages"><h2>Continue exploring</h2><ul>' +
    topic.links.map((entry) => '<li>' + link(entry) + '</li>').join("") + '</ul></section>';
}
