import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import tailwindscss from '@tailwindcss/vite'

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

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full self-center px-6 py-3">
        <div className="flex flex-row justify-between items-center">
          <img className="w-24 h-36 self-start" src="static/images/sonic.webp" alt="Sonic" />
          <nav className="flex items-center justify-center self-center flex-row gap-6">
            <Link className="text-xl md:text-4xl" to="/">Tournament</Link>
            <Link className="text-xl md:text-4xl" to="/display">Display</Link>
            <Link className="text-xl md:text-4xl" to="/draft">Draft</Link>
            <Link className="text-xl md:text-4xl" to="/scores">Scores</Link>
          </nav>
          <div className="w-24 hidden md:block" /> {/* Placeholder for spacing */}
        </div>
      </header>

      <main className="flex-1 flex flex-row p-6">
        <aside className="md:hidden">
          <img src="static/images/menu.jpg"></img>
        </aside>
        <aside className="hidden md:block w-100 border-r p-6 bg-slate-50 min-h-full">
          <h2 className="text-2xl font-bold mb-4">Sidebar</h2>
          <ul className="space-y-2">
            <li>
              <Link className="text-lg hover:underline" to="/">Home</Link>
            </li>
          </ul>
        </aside>
        <section className="flex-1 p-6">
          <Outlet />  {/* page content */}
        </section>
      </main>
    </div>
  )
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
