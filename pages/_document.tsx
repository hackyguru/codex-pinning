import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>

        <title>Third Storage</title>
        <meta name="description" content="Web3 storage pinning service for developers to build decentralised applications leveraging Decentralised Storage Networks" />


        <script
          src="https://cdn.databuddy.cc/databuddy.js"
          data-client-id="RSYtwDlso7rAALfPWQjal"
          data-enable-batching="true"
          crossOrigin="anonymous"
          async
        ></script>

        <meta property="og:url" content="https://codex-pinning.vercel.app" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="" />
        <meta property="og:description" content="" />
        <meta property="og:image" content="https://opengraph.b-cdn.net/production/images/9a21ee8b-d03c-483a-94af-addece4627a6.png?token=hG5-v3SCR2_g_R-m1jo53hGlBS7UDCz7nmcnPhOwTyk&height=630&width=1200&expires=33289139111" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta property="twitter:domain" content="codex-pinning.vercel.app" />
        <meta property="twitter:url" content="https://codex-pinning.vercel.app" />
        <meta name="twitter:title" content="" />
        <meta name="twitter:description" content="" />
        <meta name="twitter:image" content="https://opengraph.b-cdn.net/production/images/9a21ee8b-d03c-483a-94af-addece4627a6.png?token=hG5-v3SCR2_g_R-m1jo53hGlBS7UDCz7nmcnPhOwTyk&height=630&width=1200&expires=33289139111" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
