import type { AppProps } from "next/app";
import "@/styles/globals.css";

// Tránh lỗi "Cannot redefine property: ethereum" khi extension (MetaMask, v.v.) đã set window.ethereum
// và code khác (HMR, dependency) cố ghi đè.
if (typeof window !== "undefined" && "ethereum" in window) {
  try {
    const desc = Object.getOwnPropertyDescriptor(window, "ethereum");
    if (desc && !desc.configurable) {
      Object.defineProperty(window, "ethereum", { ...desc, configurable: true });
    }
  } catch {
    // Bỏ qua nếu không sửa được (ví dụ cross-origin)
  }
}

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
