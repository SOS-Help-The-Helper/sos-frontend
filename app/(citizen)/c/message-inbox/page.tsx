import { notFound } from 'next/navigation';
import MessageInboxClient from './client';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function MessageInboxPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (token !== process.env.TEST_ACCESS_TOKEN) {
    notFound();
  }

  return <MessageInboxClient />;
}
