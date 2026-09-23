import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { FixtureCard } from "./components/FixtureCard";
import { PredictionModal } from "./components/PredictionModal";
import { api } from "./utils/api";
import type { Competition, Fixture } from "./utils/api";

const TAB_LABELS: Record<string, string> = {
  PL: "EPL",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
  FL1: "Ligue 1",
  CL: "UCL",
};

const tabLabel = (c: Competition) => TAB_LABELS[c.id] ?? c.name;

interface FixturesState {
  compId: string;
  reloadKey: number;
  list: Fixture[];
  error: string | null;
}

export default function App() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionsError, setCompetitionsError] = useState<string | null>(null);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [activeComp, setActiveComp] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [fixturesState, setFixturesState] = useState<FixturesState | null>(null);
  const [selected, setSelected] = useState<Fixture | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getCompetitions()
      .then((comps) => {
        if (cancelled) return;
        setCompetitions(comps);
        if (comps.length > 0) setActiveComp(comps[0].id);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setCompetitionsError(
            e instanceof Error ? e.message : "Failed to load competitions."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCompetitions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeComp) return;
    let cancelled = false;
    api
      .getFixtures({ competition: activeComp, window: "upcoming", limit: 50 })
      .then((list) => {
        if (!cancelled) {
          setFixturesState({ compId: activeComp, reloadKey, list, error: null });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setFixturesState({
            compId: activeComp,
            reloadKey,
            list: [],
            error: e instanceof Error ? e.message : "Failed to load fixtures.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeComp, reloadKey]);

  const current =
    fixturesState &&
    fixturesState.compId === activeComp &&
    fixturesState.reloadKey === reloadKey
      ? fixturesState
      : null;

  const loadingFixtures = Boolean(activeComp) && !current;
  const fixtures = current?.list ?? [];
  const loadError = competitionsError ?? current?.error ?? null;

  const activeCompetition = competitions.find((c) => c.id === activeComp);
  const activeName = activeCompetition ? tabLabel(activeCompetition) : "";

  return (
    <>
      <Header />

      <main className="app-main">
        {loadingCompetitions ? (
          <div className="app-status">Loading competitions…</div>
        ) : (
          <nav className="sub-tabs-container league-tabs" aria-label="Competitions">
            {competitions.map((c) => (
              <button
                key={c.id}
                className={`btn-sub-tab${c.id === activeComp ? " active" : ""}`}
                onClick={() => setActiveComp(c.id)}
              >
                {tabLabel(c)}
              </button>
            ))}
          </nav>
        )}

        {loadError && (
          <div className="app-error">
            <span>{loadError}</span>
            <button
              className="btn-blue-outline"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Retry
            </button>
          </div>
        )}

        <div className="section-title-container">
          <span className="section-title">{activeName || "Fixtures"}</span>
          {!loadingFixtures && !loadError && (
            <span className="section-link" style={{ cursor: "default" }}>
              {fixtures.length} upcoming
            </span>
          )}
        </div>

        <section className="match-feed">
          {loadingFixtures ? (
            <div className="app-status">Loading fixtures…</div>
          ) : fixtures.length === 0 && !loadError ? (
            <div className="app-status">No upcoming fixtures in {activeName}.</div>
          ) : (
            fixtures.map((fx) => (
              <FixtureCard key={fx.id} fixture={fx} onSelect={setSelected} />
            ))
          )}
        </section>
      </main>

      {selected && <PredictionModal fixture={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
