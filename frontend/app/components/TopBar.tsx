"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LanguageToggle from "./LanguageToggle";

type TopBarProps = {
  showBack?: boolean;
  backHref?: string;
};

export default function TopBar({ showBack = false, backHref = "/dashboard" }: TopBarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB]">
      <div className="max-w-[1100px] mx-auto px-5 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.push(backHref)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#6B7280] hover:bg-[#F5F5F5] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <Link href="/" className="font-bold text-xl tracking-tight text-[#1A1A1A]">
            Medi<span className="text-[#0EA5E9]">Kiosk</span>
          </Link>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
