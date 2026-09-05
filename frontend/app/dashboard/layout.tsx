import TopBar from "@/app/components/TopBar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopBar showBack backHref="/dashboard" />
      <main className="flex-1">{children}</main>
    </div>
  );
}
