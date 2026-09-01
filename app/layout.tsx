import "./globals.css";

/**
 * Le <html> et le <body> sont rendus par app/[locale]/layout.tsx, qui seul
 * connaît la langue courante. Ce layout racine ne fait que transmettre.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
