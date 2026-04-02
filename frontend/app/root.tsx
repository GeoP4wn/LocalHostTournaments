import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
  useMatches,
  useNavigate,
} from "react-router";

import {
  useEffect,
  useState,
  useRef,
} from "react";

import type { Route } from "./+types/root";
import "./app.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'
library.add(fas, far, fab)

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

const NAV_LINKS = [
  { label: "Tournament", to: "/" },
  { label: "Display", to: "/display" },
  { label: "Draft", to: "/draft" },
  { label: "Scores", to: "/scores" },
];

export default function App() {
  const matches = useMatches();
  const currentHandle = matches.find((m) => m.handle?.sidebarLinks);
  const sidebarLinks = currentHandle?.handle?.sidebarLinks || [];

  const [tournament, setTournament] = useState<{ code: string; playerName?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tournament");
    setTournament(stored ? JSON.parse(stored) : null);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const leave = () => {
    localStorage.removeItem("tournament");
    setTournament(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full self-center px-6 py-3">
        <div className="flex flex-row justify-between items-center">

          {/* Mobile: Hamburger */}
          <div className="md:hidden relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <FontAwesomeIcon
                icon={menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"}
                className="text-xl w-5 h-5"
              />
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {/* Main nav */}
                <div className="p-2 border-b border-gray-100">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Sidebar contextual links */}
                {sidebarLinks.length > 0 && (
                  <div className="p-2 border-b border-gray-100">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest px-3 pt-1 pb-2">
                      On this page
                    </p>
                    {sidebarLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Tournament status */}
                {tournament && (
                  <div className="p-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm font-mono font-bold text-gray-700">{tournament.code}</span>
                      <button
                        onClick={() => { leave(); setMenuOpen(false); }}
                        className="text-gray-400 hover:text-red-500 text-xs font-bold transition-colors"
                      >
                        Leave ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Sonic logo */}
          <img className="hidden md:block w-24 h-36 self-start" src="/static/images/sonic.webp" alt="Sonic" />

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center justify-center self-center flex-row gap-6">
            {NAV_LINKS.map((link) => (
              <Link key={link.to} className="text-xl md:text-4xl" to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Tournament badge (desktop) */}
          <div>
            {tournament && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {tournament.code}
                </span>
                <button onClick={leave} className="text-gray-400 hover:text-red-500">
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-row p-6">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-100 border-r p-6 bg-slate-50 min-h-full">
          <h2 className="text-2xl font-bold mb-4">LocalHost</h2>
          <ul className="space-y-2">
            {sidebarLinks.map((link) => (
              <li key={link.to}>
                <Link className="text-lg hover:underline" to={link.to}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <section className="flex-1 p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}