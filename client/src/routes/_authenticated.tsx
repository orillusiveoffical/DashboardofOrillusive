import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/lib/api';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    if (!localStorage.getItem('token')) {
      throw redirect({ to: '/login', search: { expired: undefined } });
    }
    try {
      await authService.me();
    } catch (err) {
      localStorage.removeItem('token');
      if (err instanceof ApiError && err.code === 'DEMO_EXPIRED') {
        throw redirect({ to: '/login', search: { expired: 'demo' } });
      }
      if (err instanceof ApiError && err.code === 'SUBSCRIPTION_EXPIRED') {
        throw redirect({ to: '/login', search: { expired: 'subscription' } });
      }
      throw redirect({ to: '/login', search: { expired: undefined } });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
