import SidebarKaprodi from "@/components/sidebar-kaprodi";

export default function KaprodiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <SidebarKaprodi />
      <div className="flex-1 ml-64">
        {children}
      </div>
    </div>
  );
}