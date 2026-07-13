import React from "react";

interface TransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransitionModal: React.FC<TransitionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ animation: "fadeIn 0.2s ease" }}>
      <div 
        className="modal-content glass-card" 
        style={{ 
          maxWidth: "400px", 
          padding: "1.5rem",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
          textAlign: "left",
          gap: "1rem",
          animation: "scaleUp 0.2s ease-out"
        }}
      >
        <h2 
          className="modal-title" 
          style={{ 
            borderBottom: "1px solid var(--border-color)", 
            paddingBottom: "0.5rem", 
            color: "var(--color-text)",
            fontSize: "1.05rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            margin: 0
          }}
        >
          Tournament Transition Notice
        </h2>

        <div 
          style={{ 
            color: "var(--color-text-muted)", 
            fontSize: "0.8rem", 
            lineHeight: "1.5",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            margin: 0
          }}
        >
          <p style={{ margin: 0 }}>
            Following the conclusion of the 2026 FIFA World Cup, this platform will transition to cover domestic league competition.
          </p>
          <p style={{ margin: 0 }}>
            Predictive simulation and tactical analysis capabilities will be updated for the top five European divisions:
          </p>
          
          <ul 
            style={{ 
              margin: "0 0 0 1.25rem", 
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
              color: "var(--color-text)",
              fontWeight: 500
            }}
          >
            <li>English Premier League</li>
            <li>Spanish La Liga</li>
            <li>German Bundesliga</li>
            <li>Italian Serie A</li>
            <li>French Ligue 1</li>
          </ul>
          
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.72rem", color: "var(--color-text-muted)", fontStyle: "italic", borderTop: "1px dashed var(--border-color)", paddingTop: "0.5rem" }}>
            Please note that the platform is currently under active development. As transition updates roll out, expect regular feature additions, system refinements, and interface adjustments.
          </p>
        </div>

        <div className="modal-buttons" style={{ justifyContent: "flex-end", marginTop: "0.25rem" }}>
          <button 
            className="btn-gold" 
            onClick={onClose} 
            style={{ 
              padding: "0.5rem 1.25rem", 
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "4px"
            }}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
};
