import { redirect } from 'next/navigation';

// Root route redirects to homepage
// The partner dashboard is accessed via /agent, /map, /matching, etc.
export default function Home() {
  redirect('/home-v25.html');
}
