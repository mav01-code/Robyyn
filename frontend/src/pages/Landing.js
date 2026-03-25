import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <main className="landing">
      <section className="hero">
        <h1>
          every hero needs a <br />
          <span className="highlight">sidekick.</span>
        </h1>

        <div className="robynn-graphic">
          <span className="robynn-text">Robyyn</span>
        </div>

        <p className="subtitle">
          batman had robin. <span>now, job seekers have  robyyn.</span>
        </p>

        <p className="description">
          Run realistic mock interviews with AI scoring, transcript feedback, and a complete interview history dashboard.
        </p>

        <div className="landing-actions">
          <button className="cta-button" onClick={() => navigate("/interview")}>Start AI Interview</button>
          <button className="secondary-button" onClick={() => navigate("/results")}>View Past Results</button>
        </div>
     </section>
    </main>
  );
}

export default Landing;