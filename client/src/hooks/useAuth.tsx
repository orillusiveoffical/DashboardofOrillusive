import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, type UserProfile, type TenantProfile } from '@/services/auth.service';

interface AuthContextValue {
  user: UserProfile | null;
  tenant: TenantProfile | null;
  plan: any;
  subscription: any;
  accountType: 'DEMO' | 'PAID' | null;
  demoExpiresAt: string | null;
  isDemo: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hasToken = !!localStorage.getItem('token');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.me,
    enabled: hasToken,
    retry: false,
  });

  const logout = () => {
    authService.logout();
    queryClient.clear();
    window.location.href = '/login';
  };

  const user = data?.user ?? null;
  const tenant = data?.tenant ?? null;
  const plan = data?.plan ?? null;
  const subscription = data?.subscription ?? null;

  const accountType = tenant?.accountType || (user?.accountType as any) || null;
  const demoExpiresAt = tenant?.demoExpiresAt || null;
  const isDemo = accountType === 'DEMO';

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        plan,
        subscription,
        accountType,
        demoExpiresAt,
        isDemo,
        isLoading: hasToken && isLoading,
        isAuthenticated: !!user,
        logout,
        refetchUser: () => refetch(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
