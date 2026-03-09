import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        {/* Identidad */}
        <meta name="application-name" content="InmoCoach" />
        <meta name="description" content="Sincronizá tu agenda, medí tus reuniones cara a cara y recibí feedback real de tu negocio cada semana." />
        <meta name="theme-color" content="#ffffff" />

        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Open Graph — redes sociales */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="InmoCoach" />
        <meta property="og:title" content="InmoCoach — El 80% trabaja. El 20% produce." />
        <meta property="og:description" content="Sincronizá tu agenda, medí tus reuniones cara a cara y recibí feedback real de tu negocio cada semana." />
        <meta property="og:image" content="https://inmocoach.com.ar/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://inmocoach.com.ar" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="InmoCoach — El 80% trabaja. El 20% produce." />
        <meta name="twitter:description" content="Sincronizá tu agenda, medí tus reuniones cara a cara y recibí feedback real de tu negocio cada semana." />
        <meta name="twitter:image" content="https://inmocoach.com.ar/og-image.png" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
