import { useState } from 'react';

type LessonType = 'private' | 'couples' | 'group';

interface Service {
  id: LessonType;
  icon: string;
  label: string;
  tagline: string;
  description: string;
  capacity: string;
  duration: string;
  price: string;
}

const SERVICES: Service[] = [
  {
    id: 'private',
    icon: '🎹',
    label: 'Private Lesson',
    tagline: '1-on-1 personalised instruction',
    description:
      'The fastest path to progress. Your teacher focuses entirely on you — your technique, your repertoire, your goals.',
    capacity: '1 student',
    duration: '30 or 60 min',
    price: 'from $60',
  },
  {
    id: 'couples',
    icon: '👫',
    label: 'Couples Lesson',
    tagline: 'Learn together — friends, siblings, or partners',
    description:
      'A shared musical journey. Build duet repertoire, encourage each other, and make memories while learning piano.',
    capacity: '2 students',
    duration: '60 min',
    price: 'from $45/person',
  },
  {
    id: 'group',
    icon: '🎵',
    label: 'Group Lesson',
    tagline: 'Fun social learning for beginners',
    description:
      'An energetic class setting for 3–6 students. Great for children or adult beginners who enjoy learning alongside peers.',
    capacity: '3–6 students',
    duration: '60 min',
    price: 'from $30/person',
  },
];

interface Props {
  initialType?: string;
}

export default function BookingServices({ initialType = 'private' }: Props) {
  const validTypes: LessonType[] = ['private', 'couples', 'group'];
  const [selected, setSelected] = useState<LessonType>(
    validTypes.includes(initialType as LessonType) ? (initialType as LessonType) : 'private'
  );
  const [bookingStep, setBookingStep] = useState<'select' | 'form' | 'confirm'>('select');
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', time: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  const service = SERVICES.find((s) => s.id === selected)!;

  function handleBook() {
    setBookingStep('form');
    window.scrollTo({ top: 200, behavior: 'smooth' });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In production this would call the Wix Bookings API via an API route
    setSubmitted(true);
    setBookingStep('confirm');
  }

  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  if (submitted && bookingStep === 'confirm') {
    return (
      <div className="confirm-panel">
        <div className="confirm-icon">✅</div>
        <h2>Booking Request Sent!</h2>
        <p>
          Thank you, <strong>{form.name}</strong>! We've received your request for a{' '}
          <strong>{service.label}</strong> on <strong>{form.date}</strong> at <strong>{form.time}</strong>.
        </p>
        <p>We'll confirm your slot by email at <strong>{form.email}</strong> within 24 hours.</p>
        <button
          className="btn btn-primary"
          onClick={() => { setSubmitted(false); setBookingStep('select'); setForm({ name: '', email: '', phone: '', date: '', time: '', notes: '' }); }}
        >
          Book Another Lesson
        </button>
      </div>
    );
  }

  return (
    <div className="booking-wrapper">
      {/* Service type tabs */}
      <div className="service-tabs" role="tablist">
        {SERVICES.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={selected === s.id}
            className={`tab ${selected === s.id ? 'active' : ''}`}
            onClick={() => { setSelected(s.id); setBookingStep('select'); }}
          >
            <span className="tab-icon">{s.icon}</span>
            <span className="tab-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Service detail card */}
      {bookingStep === 'select' && (
        <div className="service-card">
          <div className="service-header">
            <div className="service-icon">{service.icon}</div>
            <div>
              <h2>{service.label}</h2>
              <p className="tagline">{service.tagline}</p>
            </div>
          </div>
          <p className="description">{service.description}</p>
          <div className="service-meta">
            <div className="meta-item">
              <span className="meta-label">Capacity</span>
              <span className="meta-value">{service.capacity}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Duration</span>
              <span className="meta-value">{service.duration}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Price</span>
              <span className="meta-value">{service.price}</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleBook}>
            Book {service.label} →
          </button>
        </div>
      )}

      {/* Booking form */}
      {bookingStep === 'form' && (
        <div className="booking-form-panel">
          <button className="back-btn" onClick={() => setBookingStep('select')}>← Back</button>
          <h2>Book your {service.label}</h2>
          <form onSubmit={handleSubmit} className="booking-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input id="name" type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input id="email" type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@example.com" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Phone (optional)</label>
                <input id="phone" type="tel" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 0100" />
              </div>
              <div className="form-group">
                <label htmlFor="date">Preferred Date *</label>
                <input id="date" type="date" required value={form.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Preferred Time *</label>
              <div className="time-slots">
                {times.map(t => (
                  <button key={t} type="button"
                    className={`time-slot ${form.time === t ? 'selected' : ''}`}
                    onClick={() => setForm(f => ({ ...f, time: t }))}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea id="notes" rows={3} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Experience level, age, any questions…" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!form.time}>
              Confirm Booking Request
            </button>
          </form>
        </div>
      )}

      <style>{`
        .booking-wrapper { max-width: 800px; }

        .service-tabs {
          display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;
        }
        .tab {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem;
          border: 2px solid var(--border); background: var(--card-bg);
          border-radius: var(--radius); cursor: pointer; font-size: 0.9rem;
          font-weight: 600; color: var(--text-muted); transition: all 0.15s;
          font-family: inherit;
        }
        .tab:hover { border-color: var(--gold); color: var(--text); }
        .tab.active { border-color: var(--gold); background: rgba(201,168,76,0.07); color: var(--text); }
        .tab-icon { font-size: 1.1rem; }

        .service-card {
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 2rem; display: flex;
          flex-direction: column; gap: 1.25rem;
        }
        .service-header { display: flex; align-items: flex-start; gap: 1rem; }
        .service-icon { font-size: 2.5rem; flex-shrink: 0; }
        .service-header h2 { font-size: 1.6rem; margin-bottom: 0.25rem; }
        .tagline { color: var(--text-muted); font-size: 0.95rem; }
        .description { color: var(--text-muted); line-height: 1.7; }

        .service-meta { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .meta-item { display: flex; flex-direction: column; gap: 0.2rem; }
        .meta-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
        .meta-value { font-size: 1rem; font-weight: 600; color: var(--gold); }

        .btn {
          display: inline-block; padding: 0.85rem 2rem;
          border-radius: var(--radius); font-weight: 600; font-size: 0.95rem;
          cursor: pointer; border: none; text-decoration: none;
          transition: all 0.2s; font-family: inherit; align-self: flex-start;
        }
        .btn-primary { background: var(--gold); color: var(--ebony); }
        .btn-primary:hover:not(:disabled) { background: var(--gold-light); }
        .btn-primary:disabled { opacity: 0.5; cursor: default; }

        .booking-form-panel {
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 2rem;
        }
        .back-btn {
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;
          padding: 0; font-family: inherit; transition: color 0.15s;
        }
        .back-btn:hover { color: var(--text); }
        .booking-form-panel h2 { font-size: 1.5rem; margin-bottom: 1.5rem; }

        .booking-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-group label { font-size: 0.85rem; font-weight: 600; color: var(--text); }
        .form-group input, .form-group textarea {
          padding: 0.65rem 0.85rem; border: 1.5px solid var(--border);
          border-radius: 8px; font-size: 0.95rem; font-family: inherit;
          background: var(--bg); color: var(--text); transition: border-color 0.15s;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none; border-color: var(--gold);
        }
        .time-slots { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .time-slot {
          padding: 0.45rem 0.9rem; border: 1.5px solid var(--border);
          border-radius: 8px; background: var(--card-bg); cursor: pointer;
          font-size: 0.88rem; font-weight: 500; color: var(--text);
          font-family: inherit; transition: all 0.15s;
        }
        .time-slot:hover { border-color: var(--gold); }
        .time-slot.selected { border-color: var(--gold); background: rgba(201,168,76,0.1); color: var(--text); font-weight: 700; }

        .confirm-panel {
          background: var(--card-bg); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 3rem 2rem; text-align: center;
          max-width: 520px; display: flex; flex-direction: column; align-items: center; gap: 1rem;
        }
        .confirm-icon { font-size: 3rem; }
        .confirm-panel h2 { font-size: 1.75rem; }
        .confirm-panel p { color: var(--text-muted); line-height: 1.6; }

        @media (max-width: 520px) {
          .form-row { grid-template-columns: 1fr; }
          .service-header { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
