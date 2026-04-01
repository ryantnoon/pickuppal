import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AdminAuth } from "@/components/admin-auth";
import { ListingsPanel } from "@/components/listings-panel";
import { TimeSlotsPanel } from "@/components/timeslots-panel";
import { BookingsPanel } from "@/components/bookings-panel";
import { SettingsPanel } from "@/components/settings-panel";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminDashboard() {
  const params = useParams<{ tab?: string }>();
  const [, setLocation] = useLocation();
  const [authed, setAuthed] = useState(false);
  const activeTab = params.tab || "listings";

  if (!authed) {
    return <AdminAuth onSuccess={() => setAuthed(true)} />;
  }

  const sidebarStyle = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={(tab) => setLocation(`/admin/${tab}`)}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="font-semibold text-sm capitalize" data-testid="text-page-title">
                {activeTab}
              </h1>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {activeTab === "listings" && <ListingsPanel />}
            {activeTab === "timeslots" && <TimeSlotsPanel />}
            {activeTab === "bookings" && <BookingsPanel />}
            {activeTab === "settings" && <SettingsPanel />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
