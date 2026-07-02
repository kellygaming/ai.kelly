import "./globals.css";

export const metadata = {
  title: "KellyIA — L'IA gaming faite pour l'Afrique",
  description: "Astuces Free Fire, PUBG Mobile, Call of Duty et plus. Génère miniatures et scripts pour tes vidéos. Sans carte bancaire : payez avec Wave, Orange Money ou MTN Mobile Money.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="font-body bg-bg text-text">{children}</body>
    </html>
  );
}
