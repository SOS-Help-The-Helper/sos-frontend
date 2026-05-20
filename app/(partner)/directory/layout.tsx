import { headers } from "next/headers";
export default async function Layout({ children }: { children: React.ReactNode }) {
  await headers();
  return <>{children}</>;
}
