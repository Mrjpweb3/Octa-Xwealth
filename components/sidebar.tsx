export default function Sidebar() {
  return (
    <aside style={{
      width: 250,
      height: "100vh",
      background: "#0B1B3A",
      color: "white",
      padding: 20
    }}>
      <h2>Octa Xwealth</h2>

      <div style={{ marginTop: 30 }}>
        <p>Dashboard</p>
        <p>Portfolio</p>
        <p>Admin</p>
      </div>
    </aside>
  );
}
