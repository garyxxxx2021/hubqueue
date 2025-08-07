
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Header from "@/components/header";
import { Skeleton } from "../ui/skeleton";
import MaintenancePage from "../maintenance-page";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isMaintenanceMode, isSelfDestructed } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      const callbackUrl = pathname;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return <div className="w-screen h-screen bg-background" />;
  }

  if (isSelfDestructed) {
    return <div className="w-screen h-screen bg-background" />;
  }
  
  if (!user) {
    // This case should theoretically be covered by the useEffect redirect,
    // but as a fallback, we can show a blank page.
    return <div className="w-screen h-screen bg-background" />;
  }

  if (isMaintenanceMode && !user.isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}
