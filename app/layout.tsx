import "./globals.css";

export const metadata = {
  title: "KellyIA — L'intelligence artificielle pensée pour l'Afrique",
  description: "Discutez, résolvez des problèmes complexes et générez des images avec KellyIA. Sans carte bancaire : payez avec Wave, Orange Money ou MTN Mobile Money.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="font-body bg-bg text-text">{children}</body>
    </html>
  );
}
