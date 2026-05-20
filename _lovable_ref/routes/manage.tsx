import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/manage")({
  component: () => <Navigate to="/directory" />,
});
