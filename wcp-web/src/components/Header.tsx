import React from "react";
import { Trophy } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="logo-container">
        <Trophy size={26} color="#fbbf24" />
        <div className="logo-text">
          <span className="logo-text-desktop">
            Oracle <span>Football Predictions</span>
          </span>
          <span className="logo-text-mobile">Oracle</span>
        </div>
      </div>
    </header>
  );
};
