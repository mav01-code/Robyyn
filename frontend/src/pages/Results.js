import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Results.css";

const API_BASE = "http://localhost:8000";

function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedSessionId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("session");
  }, [location.search]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE}/interviews/history?limit=20`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Failed to fetch history");
        }
        setSessions(data.items || []);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to load history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    const loadSelected = async () => {
      if (!selectedSessionId) {
        setSelectedSession(null);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/interviews/${selectedSessionId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Failed to fetch interview report");
        }
        setSelectedSession(data);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to fetch session details.");
      }
    };

    loadSelected();
  }, [selectedSessionId]);

  const openSession = async (sessionId) => {
    navigate(`/results?session=${sessionId}`);
  };

  return (
    <main className="results-page">
      <section className="results-wrap">
        <h1>Interview Results</h1>
        <p className="subtitle">Track every Robyyn interview and review AI feedback.</p>

        {error && <p className="error-text">{error}</p>}

        <div className="results-layout">
          <div className="history-column">
            <h2>History</h2>
            {loading ? (
              <p>Loading interviews...</p>
            ) : sessions.length === 0 ? (
              <p>No interviews yet. Start one now.</p>
            ) : (
              <div className="history-list">
                {sessions.map((session) => (
                  <button
                    className={`history-item ${selectedSessionId === session.session_id ? "active" : ""}`}
                    key={session.session_id}
                    onClick={() => openSession(session.session_id)}
                  >
                    <div className="history-top">
                      <strong>{session.candidate_name}</strong>
                      <span>{session.status}</span>
                    </div>
                    <p>{session.role}</p>
                    <p>Score: {session.overall_score}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="detail-column">
            <h2>Report</h2>
            {!selectedSession ? (
              <p>Select an interview from history to view complete details.</p>
            ) : (
              <div className="session-report">
                <div className="report-header">
                  <h3>{selectedSession.candidate_name}</h3>
                  <p>{selectedSession.role}</p>
                </div>

                {selectedSession.summary && (
                  <div className="summary-card">
                    <p>Overall Score: <strong>{selectedSession.summary.overall_score}</strong></p>
                    <p>Recommendation: {selectedSession.summary.recommendation}</p>
                  </div>
                )}

                <div className="qa-list">
                  {(selectedSession.answers || []).map((answer) => (
                    <article key={answer.question_index} className="qa-item">
                      <h4>Q{answer.question_index + 1}: {answer.question}</h4>
                      <p><strong>Transcript:</strong> {answer.transcript}</p>
                      <p><strong>Score:</strong> {answer.score.overall}</p>
                      {answer.score.follow_up_tip && <p><strong>Tip:</strong> {answer.score.follow_up_tip}</p>}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Results;
