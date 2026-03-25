import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Interview.css";

const API_BASE = "http://localhost:8000";

function Interview() {
  const navigate = useNavigate();
  const [candidateName, setCandidateName] = useState("");
  const [role, setRole] = useState("");
  const [roles, setRoles] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responses, setResponses] = useState({});
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await fetch(`${API_BASE}/roles`);
        const data = await response.json();
        setRoles(data.roles || []);
      } catch (fetchError) {
        setError("Failed to load roles. Ensure backend is running on port 8000.");
      }
    };

    loadRoles();
  }, []);

  useEffect(() => {
    if (sessionId) {
      startVideoStream();
    }
    return () => {
      stopVideoStream();
    };
  }, [sessionId]);

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      setError("Please allow camera and microphone access to continue.");
    }
  };

  const stopVideoStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const speakQuestion = async (activeSessionId, questionIndex) => {
    if (!activeSessionId) {
      return;
    }
    try {
      await fetch(`${API_BASE}/interviews/${activeSessionId}/speak?question_index=${questionIndex}`, {
        method: "POST",
      });
    } catch {
      // no-op: speaking failure should not block interview
    }
  };

  const startInterview = async () => {
    if (!candidateName.trim() || !role) {
      setError("Enter candidate name and select a role.");
      return;
    }

    setIsStarting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/interviews/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, candidate_name: candidateName }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to start interview");
      }

      setSessionId(data.session_id);
      setQuestions(data.questions || []);
      setCurrentQuestionIndex(0);
      setResponses({});
      setSummary(null);

      await speakQuestion(data.session_id, 0);
    } catch (startError) {
      setError(startError.message || "Failed to start interview");
    } finally {
      setIsStarting(false);
    }
  };

  const getSupportedMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus"
    ];

    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "";
  };

  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) {
      setError("Video stream is not ready yet.");
      return;
    }

    const stream = videoRef.current.srcObject;
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      setError("Microphone not available. Please allow microphone access.");
      return;
    }

    const audioStream = new MediaStream(audioTracks);
    const mimeType = getSupportedMimeType();
    let mediaRecorder;

    try {
      mediaRecorder = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);
    } catch {
      setError("Recording is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blobType = mimeType || "audio/webm";
      const audioBlob = new Blob(chunksRef.current, { type: blobType });
      await submitAudio(audioBlob);
    };

    mediaRecorder.start();
    setError("");
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitAudio = async (audioBlob) => {
    if (!sessionId) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "answer.webm");
      formData.append("question_index", String(currentQuestionIndex));

      const response = await fetch(`${API_BASE}/interviews/${sessionId}/answers`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to submit answer");
      }

      setResponses((previous) => ({
        ...previous,
        [currentQuestionIndex]: data.answer,
      }));

      if (data.summary) {
        setSummary(data.summary);
      }

      if (data.session_status === "completed") {
        navigate(`/results?session=${sessionId}`);
      }
    } catch (submitError) {
      setError(submitError.message || "Failed to upload answer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = async () => {
    if (!responses[currentQuestionIndex]) {
      setError("Record and submit your answer before moving to next question.");
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setError("");
      await speakQuestion(sessionId, nextIndex);
    } else {
      await endInterview();
    }
  };

  const endInterview = async () => {
    if (!sessionId) {
      return;
    }
    try {
      await fetch(`${API_BASE}/interviews/${sessionId}/complete`, {
        method: "POST",
      });
    } catch {
      // no-op
    }
    stopVideoStream();
    navigate(`/results?session=${sessionId}`);
  };

  const currentResponse = responses[currentQuestionIndex];

  return (
    <main className="interview">
      <div className="star star-1"></div>
      <div className="star star-2"></div>
      <div className="star star-3"></div>
      <div className="star star-4"></div>
      <div className="star star-5"></div>
      <div className="star star-6"></div>

      <section className="interview-content">
        {!sessionId ? (
          <div className="interview-setup">
            <h1>AI Interview Platform</h1>
            <p className="subtitle">Start a full mock interview with instant coaching feedback</p>

            <div className="candidate-input">
              <label htmlFor="candidate-name">Candidate name</label>
              <input
                id="candidate-name"
                value={candidateName}
                onChange={(event) => setCandidateName(event.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="role-selector">
              <label htmlFor="role-select">Choose a role:</label>
              <select
                id="role-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="role-dropdown"
              >
                <option value="">-- Select Role --</option>
                {roles.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button onClick={startInterview} className="start-button" disabled={isStarting}>
              {isStarting ? "Starting..." : "Start Interview"}
            </button>
          </div>
        ) : (
          <div className="interview-active">
            <div className="video-container">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                className="video-preview"
              />
            </div>

            <div className="interview-controls">
              <h2 className="current-role">{role} · {candidateName}</h2>
              <p className="question-counter">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
              
              <div className="question-box">
                <h3>Question:</h3>
                <p className="question-text">
                  {questions[currentQuestionIndex]}
                </p>
              </div>

              <div className="recording-controls">
                {!isRecording ? (
                  <button onClick={startRecording} className="record-button" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "🎤 Start Recording Answer"}
                  </button>
                ) : (
                  <button onClick={stopRecording} className="stop-button">
                    ⏹️ Stop Recording
                  </button>
                )}
              </div>

              {error && <p className="error-text">{error}</p>}

              {currentResponse && (
                <div className="transcript-box">
                  <h4>Your Answer:</h4>
                  <p>{currentResponse.transcript}</p>

                  <div className="score-grid">
                    <div>Overall: <strong>{currentResponse.score.overall}</strong></div>
                    <div>Relevance: <strong>{currentResponse.score.dimensions.relevance}</strong></div>
                    <div>Depth: <strong>{currentResponse.score.dimensions.depth}</strong></div>
                    <div>Clarity: <strong>{currentResponse.score.dimensions.clarity}</strong></div>
                  </div>

                  {currentResponse.score.improvements?.length > 0 && (
                    <p className="coaching-tip">Tip: {currentResponse.score.improvements[0]}</p>
                  )}
                </div>
              )}

              {summary && (
                <div className="mini-summary">
                  <p>Current overall score: <strong>{summary.overall_score}</strong></p>
                  <p>Recommendation: {summary.recommendation}</p>
                </div>
              )}

              <div className="navigation-buttons">
                <button onClick={nextQuestion} className="next-button">
                  Next Question →
                </button>
                <button onClick={endInterview} className="end-button">
                  End Interview
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default Interview;