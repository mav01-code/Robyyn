import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Header.css";

function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Interview", path: "/interview" },
    { label: "Results", path: "/results" },
  ];

  const handleLaunch = () => {
    navigate("/interview");
  };

  return (
    <header className="header">
      <div className="header-logo">Robyyn</div>

      <nav className="header-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            className={`header-link ${location.pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <button className="header-cta" onClick={handleLaunch}>
        Launch Interview
      </button>
    </header>
  );
}

export default Header;