/**
 * ESLint rule: Catch TanStack Router patterns in data objects.
 * Prevents `to: { route: "..." }` in object literals — should be `href: "/..."`.
 * Created after production crash on 2026-05-25.
 */
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Prevent TanStack Router 'to: { route }' patterns in data objects" },
    messages: {
      tanstackRoute: 'Found "to: { route: ... }" pattern — use "href: `/path/${id}`" instead (Next.js, not TanStack Router).',
    },
  },
  create(context) {
    return {
      Property(node) {
        if (
          node.key.name === "to" &&
          node.value.type === "ObjectExpression" &&
          node.value.properties.some(p => p.key?.name === "route")
        ) {
          context.report({ node, messageId: "tanstackRoute" });
        }
      },
    };
  },
};
