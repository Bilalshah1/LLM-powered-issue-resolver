import Link from "next/link";
import About from "../about/page";

export default function Navbar() {
    return (
        <nav className="w-full bg-gradient-to-br from-[#0a0a0ab3] to-[#23272fb3] backdrop-blur-md flex items-center justify-between px-8 py-3 border-b border-[#23272f]">
            <div className="flex  mx-auto gap-17 justify-center items-center">
                <NavItem label="Home" href="/home"  />
                <NavItem label="About" href="/about"  />
                <NavItem label="Contact" href="/contact"  />
                <NavItem label="Blog" href="/blog"  />
                <NavItem label="Resources" href="/resources"  />
                <NavItem label="Company" href="/company"  />
            </div>
        </nav>
    );
}

function NavItem({ label, href, hasDropdown }: { label: string; href: string; hasDropdown?: boolean }) {
    return (
        <Link href={href} className="flex items-center gap-1 text-white font-semibold text-base cursor-pointer hover:text-[#3fffd8] transition">
            <span>{label}</span>
            {hasDropdown && (
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="inline-block">
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
        </Link>
    );
}
