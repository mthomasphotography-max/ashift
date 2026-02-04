import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  const buttonStyle = {
    padding: "40px 60px",
    fontSize: "24px",
    fontWeight: 600,
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    minWidth: "320px",
  };

  const rotaButtonStyle = {
    ...buttonStyle,
    background: "linear-gradient(135deg, #1a1a1a 0%, #333 100%)",
  };

  const skapButtonStyle = {
    ...buttonStyle,
    background: "linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)",
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "70vh",
      gap: "40px"
    }}>
      <h1 style={{
        fontSize: "42px",
        fontWeight: 700,
        color: "#1a1a1a",
        marginBottom: "20px",
        textAlign: "center"
      }}>
        Welcome to A Shift Management
      </h1>

      <div style={{
        display: "flex",
        gap: "40px",
        flexWrap: "wrap",
        justifyContent: "center"
      }}>
        <button
          style={rotaButtonStyle}
          onClick={() => navigate("/staff-plan")}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          }}
        >
          Weekly Rota
        </button>

        <button
          style={skapButtonStyle}
          onClick={() => navigate("/skap")}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(196, 30, 58, 0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
          }}
        >
          SKAP
        </button>
      </div>

      <p style={{
        fontSize: "16px",
        color: "#666",
        maxWidth: "600px",
        textAlign: "center",
        marginTop: "20px"
      }}>
        Manage weekly rotas and track operator skill progression through the Skills Knowledge Advancement Program
      </p>
    </div>
  );
}
