import "./tailwind.css";
import { QueryProvider } from "../providers/QueryProvider";

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
