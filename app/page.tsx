import { redirect } from 'next/navigation';

// Root route — serves the static homepage
// This file exists at the top level to prevent the (partner) route group
// from catching / and rendering the dashboard shell
export default function RootPage() {
  redirect('/home-v25.html');
}
