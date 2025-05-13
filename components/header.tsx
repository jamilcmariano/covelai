"use client";

import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">
          Covel<span className="text-primary">AI</span>
        </Link>
        <div className="flex items-center gap-4">
          <nav>
            <ul className="flex gap-6">
              <li>
                <Link
                  href="/"
                  className={`hover:text-primary transition-colors ${pathname === "/" ? "text-primary font-medium" : ""}`}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/generate"
                  className={`hover:text-primary transition-colors ${
                    pathname === "/generate" ? "text-primary font-medium" : ""
                  }`}
                >
                  Generate
                </Link>
              </li>
            </ul>
          </nav>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
