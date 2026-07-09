import { useState, useEffect, useRef } from "react";

export interface CoParticipant {
  memberId: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Props {
  onSelect: (participant: CoParticipant | null) => void;
  selected: CoParticipant | null;
}

export default function CoParticipantSelector({ onSelect, selected }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CoParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(query)}`);
        const data: CoParticipant[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (p: CoParticipant) => {
    onSelect(p);
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  const clear = () => {
    onSelect(null);
    setQuery("");
  };

  if (selected) {
    return (
      <div className="co-participant-selected">
        <div className="co-participant-avatar">
          {selected.avatarUrl ? (
            <img src={selected.avatarUrl} alt={selected.name} />
          ) : (
            <span>{selected.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="co-participant-details">
          <span className="co-participant-name">{selected.name}</span>
          {selected.email && <span className="co-participant-email">{selected.email}</span>}
        </div>
        <button type="button" className="co-participant-remove" onClick={clear} aria-label="Remove co-participant">×</button>
      </div>
    );
  }

  return (
    <div className="co-participant-search" ref={wrapRef}>
      <input
        className="booking-input"
        type="text"
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {loading && <span className="co-participant-loading">Searching…</span>}
      {open && results.length > 0 && (
        <ul className="co-participant-dropdown">
          {results.map((p) => (
            <li key={p.memberId}>
              <button type="button" className="co-participant-option" onClick={() => pick(p)}>
                <div className="co-participant-avatar co-participant-avatar--sm">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt={p.name} />
                  ) : (
                    <span>{p.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="co-participant-name">{p.name}</div>
                  {p.email && <div className="co-participant-email">{p.email}</div>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
