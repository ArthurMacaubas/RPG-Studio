import { Head, Html, Main, NextScript } from 'next/document';

// O Studio usa App Router. Este documento existe apenas para as páginas de
// erro legadas (/404 e /500) que o Next ainda pré-renderiza durante o build.
export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
