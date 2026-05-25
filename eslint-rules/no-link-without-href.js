/**
 * ESLint rule: Prevent <Link> from next/link without an href prop.
 * Catches TanStack Router "to" prop usage and missing href entirely.
 * Created after production crash on 2026-05-25.
 */
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Require href prop on next/link Link components" },
    messages: {
      missingHref: '<Link> must have an "href" prop. Found "{{prop}}" instead — this is TanStack Router syntax, not Next.js.',
      noHref: '<Link> is missing the "href" prop. Next.js Link requires href.',
    },
  },
  create(context) {
    let linkImported = false;
    return {
      ImportDeclaration(node) {
        if (node.source.value === "next/link") linkImported = true;
      },
      JSXOpeningElement(node) {
        if (!linkImported || node.name.name !== "Link") return;
        const attrs = node.attributes.filter(a => a.type === "JSXAttribute");
        const hasHref = attrs.some(a => a.name.name === "href");
        const hasTo = attrs.find(a => a.name.name === "to");
        if (hasTo) {
          context.report({ node: hasTo, messageId: "missingHref", data: { prop: "to" } });
        } else if (!hasHref) {
          context.report({ node, messageId: "noHref" });
        }
      },
    };
  },
};
