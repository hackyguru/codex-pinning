import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
      <script
    src="https://cdn.databuddy.cc/databuddy.js"
    data-client-id="RSYtwDlso7rAALfPWQjal"
    data-enable-batching="true"
    crossOrigin="anonymous"
    async
  ></script>
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
