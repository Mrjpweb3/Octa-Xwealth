import Sidebar from "../components/Sidebar";

export default function RootLayout({ children }) {
  return (
    <html>
      <body style={{ margin: 0 }}>
        <div style={{ display: "flex" }}>
          <Sidebar />
          <main style={{ flex: 1, padding: 20 }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
