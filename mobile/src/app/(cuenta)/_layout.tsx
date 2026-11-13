import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../lib/session';
import { Loading } from '../../ui/kit';
export default function ProtectedLayout() {
  const {session,loading} = useSession();
  if (loading) return <Loading/>;
  if (!session) return <Redirect href="/"/>;
  return <Stack screenOptions={{headerShown:false}}/>;
}
