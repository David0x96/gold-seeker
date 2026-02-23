import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        {/* Chạy sớm nhất để tránh "Cannot redefine property: ethereum" (MetaMask / extension) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                try {
                  if ('ethereum' in window) {
                    var d = Object.getOwnPropertyDescriptor(window, 'ethereum');
                    if (d && !d.configurable) {
                      Object.defineProperty(window, 'ethereum', { configurable: true, enumerable: d.enumerable, value: window.ethereum, writable: d.writable });
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
