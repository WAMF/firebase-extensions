import type { MetaFunction, LinksFunction } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import styles from './tailwind.css';

export const meta: MetaFunction = () => [
  { title: 'Firestore Record Acknowledgments - Admin Dashboard' },
];

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles }];

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <header className="bg-slate-800">
          <div className="max-w-5xl mx-auto py-6 text-white flex items-center">
            <h1 className="flex-grow text-2xl font-bold leading-tight tracking-tight">
              <a href="/">Firestore Record Acknowledgments</a>
            </h1>
            <ul className="flex items-center gap-4">
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  href="https://firebase.google.com/products/extensions/firestore-record-acknowledgments"
                >
                  View Extension
                </a>
              </li>
              <li>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  href="https://firebase.google.com/docs/extensions"
                >
                  Firebase Docs
                </a>
              </li>
            </ul>
          </div>
        </header>
        <main className="my-6">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
