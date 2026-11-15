import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/session';
import { getProfileAction } from '@/lib/profile-actions';
import { listCurrenciesAction } from '@/lib/deals/journey-actions';
import { ProfileForm } from './form';

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect('/login');
  const [profile, currencies] = await Promise.all([getProfileAction(), listCurrenciesAction()]);
  return <ProfileForm initial={profile} currencies={currencies} />;
}
