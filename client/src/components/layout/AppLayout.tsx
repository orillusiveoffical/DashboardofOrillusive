import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  BedDouble,
  CalendarDays,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronDown,
  Globe,
  Shield,
  Tag,
  Calendar,
  Sparkles,
  TrendingUp,
  UserCheck,
  Bell,
  CreditCard,
  Rocket,
  Plus,
  Hotel,
  Search,
  Clock,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { cn, getInitials } from '@/lib/utils';
import { notificationsService } from '@/services/notifications.service';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';

interface NavSubItem {
  to: string;
  label: string;
  icon?: any;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  to?: string;
  children?: NavSubItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'FRONT DESK & OPERATIONS',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
      {
        id: 'reservations',
        label: 'Reservations & Grid',
        icon: BookOpen,
        children: [
          { to: '/bookings', label: 'Bookings List', icon: BookOpen },
          { to: '/calendar', label: 'Availability Calendar', icon: CalendarDays },
          { to: '/availability', label: 'Room Block Grid', icon: Calendar },
        ],
      },
    ],
  },
  {
    title: 'INVENTORY & HOUSEKEEPING',
    items: [
      {
        id: 'inventory',
        label: 'Room Inventory',
        icon: BedDouble,
        children: [
          { to: '/rooms', label: 'All Rooms', icon: BedDouble },
          { to: '/room-types', label: 'Room Types & Rates', icon: Tag },
          { to: '/housekeeping', label: 'Housekeeping Readiness', icon: Sparkles },
        ],
      },
    ],
  },
  {
    title: 'GUEST MANAGEMENT',
    items: [
      { id: 'guests', label: 'Guest Profiles & CRM', icon: Users, to: '/guests' },
    ],
  },
  {
    title: 'CHANNELS & ANALYTICS',
    items: [
      {
        id: 'channels',
        label: 'Distribution & Reports',
        icon: Globe,
        children: [
          { to: '/ota', label: 'OTA Channel Manager', icon: Globe },
          { to: '/reports', label: 'Reports & Analytics', icon: TrendingUp },
        ],
      },
    ],
  },
  {
    title: 'HOTEL ADMINISTRATION',
    items: [
      {
        id: 'admin-settings',
        label: 'Settings & Staff',
        icon: Settings,
        children: [
          { to: '/staff', label: 'Staff & Permissions', icon: UserCheck },
          { to: '/notifications', label: 'Notification Center', icon: Bell },
          { to: '/admin/settings', label: 'Hotel Profile', icon: Settings },
          { to: '/subscription', label: 'Subscription & Billing', icon: CreditCard },
          { to: '/onboarding', label: 'Setup Wizard', icon: Rocket },
        ],
      },
    ],
  },
];

const adminItems = [
  { to: '/admin/saas', label: 'SaaS Super Admin Portal', icon: Shield },
  { to: '/admin/settings', label: 'Global Platform Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isDemo, demoExpiresAt, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({});
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith('/admin'));

  const { toasts, dismissToast } = useNotificationSocket();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.getNotifications,
    refetchInterval: 15000,
  });

  const notifList = Array.isArray(notifData) ? notifData : [];
  const unreadCount = notifList.filter((n) => !n.isRead).length;

  // Auto-expand submenus if active route belongs to them
  useEffect(() => {
    const nextState: Record<string, boolean> = { ...expandedSubmenus };
    let changed = false;

    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children) {
          const hasActiveChild = item.children.some((child) => pathname === child.to || pathname.startsWith(child.to));
          if (hasActiveChild && !nextState[item.id]) {
            nextState[item.id] = true;
            changed = true;
          }
        }
      });
    });

    if (changed) {
      setExpandedSubmenus(nextState);
    }
  }, [pathname]);

  const toggleSubmenu = (id: string) => {
    setExpandedSubmenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const showAdmin = user && (user.role as any) === 'SUPER_ADMIN';
  const hotelName = user?.hotel?.name || 'Orillusive Grand Hotel';

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] relative font-sans transition-colors duration-200">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Real-time Toast Alert System Popup Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300 text-[var(--text-primary)]"
          >
            <div className="p-2 rounded-xl bg-[#81A6C6]/20 text-[#81A6C6] shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] tracking-tight">{toast.title}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">{toast.message}</p>
              <p className="text-[9px] text-[var(--text-muted)] mt-1">Just now</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-[var(--text-primary)] text-xs font-bold p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Theme-Aware Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--text-primary)] transition-all lg:static lg:translate-x-0 shadow-sm',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-[var(--sidebar-border)] px-6 bg-[var(--sidebar-header)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#81A6C6] shadow-sm">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[var(--text-primary)] tracking-tight">ORILLUSIVE</p>
            <p className="text-[9px] uppercase tracking-widest text-[#81A6C6] font-bold">HMS SaaS Platform</p>
          </div>
          <button className="ml-auto lg:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">{group.title}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                if (item.children) {
                  const isParentActive = item.children.some((child) => pathname === child.to || pathname.startsWith(child.to));
                  const isOpen = !!expandedSubmenus[item.id];

                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => toggleSubmenu(item.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150',
                          isParentActive
                            ? 'text-[#81A6C6] font-bold bg-[#81A6C6]/15 border border-[#81A6C6]/30'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', isParentActive ? 'text-[#81A6C6]' : 'text-[var(--text-muted)]')} />
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200 text-[var(--text-muted)]', isOpen && 'rotate-180')} />
                      </button>

                      {isOpen && (
                        <div className="ml-4 space-y-1 border-l border-[var(--sidebar-border)] pl-3 pt-0.5">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon || Icon;
                            const isChildActive = pathname === child.to || (child.to !== '/dashboard' && pathname.startsWith(child.to));
                            return (
                              <Link
                                key={child.to}
                                to={child.to}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150',
                                  isChildActive
                                    ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] font-bold border-r-2 border-[#81A6C6] shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                                )}
                              >
                                <ChildIcon className={cn('h-3.5 w-3.5 shrink-0', isChildActive ? 'text-[#81A6C6]' : 'text-[var(--text-muted)]')} />
                                <span className="truncate">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = pathname === item.to || (item.to !== '/dashboard' && !!item.to && pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.id}
                    to={item.to!}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150',
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] font-bold border-r-2 border-[#81A6C6] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[#81A6C6]' : 'text-[var(--text-muted)]')} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {showAdmin && (
            <div className="pt-3 border-t border-[var(--sidebar-border)] space-y-1">
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-[#81A6C6] hover:bg-[var(--bg-surface)]"
              >
                <Shield className="h-4 w-4 text-[#81A6C6]" />
                SaaS Super Admin
                <ChevronDown className={cn('ml-auto h-4 w-4 transition text-[var(--text-muted)]', adminOpen && 'rotate-180')} />
              </button>
              {adminOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-[var(--sidebar-border)] pl-4">
                  {adminItems.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition',
                        pathname.startsWith(to) ? 'text-[#81A6C6] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Persistent Sidebar User Profile Footer */}
        {user && (
          <div className="border-t border-[var(--sidebar-border)] p-4 bg-[var(--sidebar-header)]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#81A6C6] text-xs font-bold text-white shadow-sm shrink-0">
                {getInitials(user.firstName, user.lastName)}
              </div>
              <div className="flex-1 min-w-0 truncate">
                <p className="truncate text-xs font-bold text-[var(--text-primary)]">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-[10px] text-[var(--text-muted)] font-mono">{user.email || user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="rounded-xl p-2 text-[var(--text-muted)] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area with Theme-Aware Header */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Navigation Header Bar */}
        <header className="flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-card)] px-4 lg:px-6 shadow-sm text-[var(--text-primary)] transition-colors duration-200 shrink-0">
          <div className="flex items-center gap-2.5 lg:gap-4 flex-1 min-w-0 overflow-hidden">
            <button className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] shrink-0 whitespace-nowrap">
              <Hotel className="w-3.5 h-3.5 text-[#81A6C6] shrink-0" />
              <span className="font-bold truncate max-w-[130px] xl:max-w-[190px]">{hotelName}</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                Active Tenant
              </span>
            </div>

            {/* 3-Day Demo Account Header Banner */}
            {isDemo && demoExpiresAt && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-bold shrink-0 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
                <span className="whitespace-nowrap">3-Day Demo: Expires {new Date(demoExpiresAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <Link
                  to="/subscription"
                  className="ml-1 px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold transition shrink-0"
                >
                  Upgrade
                </Link>
              </div>
            )}

            {/* Integrated Search Bar */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs text-[var(--text-muted)] max-w-xs w-full min-w-[150px] shrink-0">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                placeholder="Search bookings, rooms, guests..."
                className="bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none w-full min-w-0"
              />
              <kbd className="hidden lg:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] shrink-0">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs text-[var(--text-secondary)] shrink-0 whitespace-nowrap">
              <span>Occupancy:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">84%</span>
            </div>

            <Link
              to="/bookings"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-white text-xs font-bold shadow-sm transition shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" /> New Booking
            </Link>

            <Link
              to="/notifications"
              className="p-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] border border-[var(--border)] transition relative shrink-0"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#81A6C6] text-[9px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Header User Profile Control & Dropdown */}
            {user && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--accent-soft)] border border-[var(--border)] transition text-xs text-[var(--text-primary)] shrink-0 whitespace-nowrap"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#81A6C6] text-[11px] font-bold text-white shadow-xs shrink-0">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="font-bold text-xs truncate max-w-[110px] text-[var(--text-primary)]">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-[9px] font-semibold text-[#81A6C6]">{user.role}</span>
                  </div>
                  <ChevronDown className={cn('w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200', profileMenuOpen && 'rotate-180')} />
                </button>

                {profileMenuOpen && (
                  <>
                    {/* Backdrop to dismiss dropdown on outside click */}
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />

                    <div className="absolute right-0 mt-2 z-50 w-64 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl p-3 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 text-[var(--text-primary)]">
                      {/* User & Tenant Info Summary */}
                      <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                        <p className="font-extrabold text-xs text-[var(--text-primary)] truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate font-mono">{user.email}</p>
                        <div className="pt-1.5 flex items-center justify-between text-[10px] border-t border-[var(--border)] mt-1.5">
                          <span className="font-bold text-[#81A6C6] uppercase tracking-wider">{user.role}</span>
                          <span className="font-semibold text-[var(--text-muted)] truncate max-w-[110px]">{hotelName}</span>
                        </div>
                      </div>

                      {/* Theme Appearance Selector */}
                      <div className="space-y-1.5 px-1">
                        <p className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Appearance Theme</p>
                        <div className="grid grid-cols-3 gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border)] text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setTheme('light')}
                            className={cn(
                              'py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition',
                              theme === 'light'
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-extrabold'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            )}
                          >
                            <Sun className="w-3 h-3 text-amber-500 shrink-0" /> Light
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme('dark')}
                            className={cn(
                              'py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition',
                              theme === 'dark'
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-extrabold'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            )}
                          >
                            <Moon className="w-3 h-3 text-indigo-400 shrink-0" /> Dark
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme('system')}
                            className={cn(
                              'py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition',
                              theme === 'system'
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs border border-[var(--border)] font-extrabold'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            )}
                          >
                            <Monitor className="w-3 h-3 text-[#81A6C6] shrink-0" /> Auto
                          </button>
                        </div>
                      </div>

                      {/* Quick Navigation Links */}
                      <div className="space-y-0.5 pt-1 border-t border-[var(--border)] text-xs">
                        <Link
                          to="/subscription"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition font-medium"
                        >
                          <CreditCard className="w-4 h-4 text-[#81A6C6]" />
                          <span>Subscription & Billing</span>
                        </Link>
                        <Link
                          to="/admin/settings"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition font-medium"
                        >
                          <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                          <span>Hotel Profile & Settings</span>
                        </Link>
                      </div>

                      {/* Log Out Action */}
                      <div className="pt-1 border-t border-[var(--border)]">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition text-xs"
                        >
                          <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[var(--bg-app)] p-6 transition-colors duration-200">{children}</main>
      </div>
    </div>
  );
}
