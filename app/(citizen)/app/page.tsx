import { redirect } from 'next/navigation';
// Citizen app main — V2 redesign will replace this
// For now redirect to /c while V2 is being built
export default function AppPage() {
  redirect('/c');
}
