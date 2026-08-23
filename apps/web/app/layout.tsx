import "./globals.css";
import type { Metadata } from "next";
import PwaRegister from "../components/PwaRegister";

export const metadata: Metadata = {
  title: { default: "EduFix", template: "%s · EduFix" },
  description: "Nền tảng quản lý tài sản, sự cố và bảo trì thiết bị trường học",
  applicationName: "EduFix",
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
