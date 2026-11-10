import StaffShell from '@/components/StaffShell';

// Proteksi role dilakukan oleh middleware.js + RLS Supabase.
export default function Layout({ children }) {
  return <StaffShell role="admin">{children}</StaffShell>;
}
