"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { saveProfileAction } from "@/lib/profile-actions";
import { COUNTRIES } from "@/lib/iso-countries";
import { toast } from "@/components/destified/toast";
import { findInvalidDateFields, type DateFieldState } from "@/lib/profile-validation";
import type { PermanentProfile } from "@/lib/user-profile";

const T2 = [
  { title: 'Cards', body: 'Track credit cards and benefits used for trip planning.' },
  { title: 'Points programs', body: 'Loyalty programs you earn / redeem with.' },
  { title: 'Dietary', body: 'Dietary preferences and restrictions.' },
  { title: 'Allergies', body: 'Allergies that matter for travel.' },
  { title: 'Mobility', body: 'Mobility needs that affect itineraries.' },
];

export function ProfileForm({ initial }: { initial: PermanentProfile | null }) {
  const [citizenships, setCitizenships] = useState<{ country: string; passportExpiry: string | null }[]>(
    initial?.citizenships ?? [],
  );
  const [residence, setResidence] = useState<{ country: string; visaStatus: 'tourist' | 'permanent' | 'digital-nomad' | 'work' | 'other' | null } | null>(
    initial?.residence ?? null,
  );
  const [conv, setConv] = useState<'1949' | '1968' | null>(initial?.idpConvention ?? null);
  const [expiry, setExpiry] = useState<string | null>(initial?.idpExpiry ?? null);
  const [meds, setMeds] = useState<string[]>(initial?.controlledMeds ?? []);
  const [hasMinors, setHasMinors] = useState<boolean>(initial?.hasMinors ?? false);
  const [medDraft, setMedDraft] = useState('');
  const [invalidDateIds, setInvalidDateIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLDivElement>(null);

  const save = () => {
    // Read each date control's live DOM validity: a partial entry (e.g. "2029")
    // never reaches React state, so we must inspect `validity.badInput` here
    // rather than trust the captured value (issue #20).
    const dateFields: DateFieldState[] = formRef.current
      ? Array.from(formRef.current.querySelectorAll<HTMLInputElement>('input[type="date"]')).map((el) => ({
          id: el.id,
          label: el.dataset.label ?? el.id,
          value: el.value || null,
          badInput: el.validity.badInput,
        }))
      : [];
    const invalid = findInvalidDateFields(dateFields);
    if (invalid.length > 0) {
      setInvalidDateIds(invalid.map((f) => f.id));
      toast(`Check ${invalid.map((f) => f.label).join(', ')} — pick a full date or clear the field.`);
      return;
    }
    setInvalidDateIds([]);

    startTransition(async () => {
      try {
        await saveProfileAction({
          citizenships, residence,
          idpConvention: conv, idpExpiry: expiry,
          controlledMeds: meds, hasMinors,
        });
        toast('Profile saved');
      } catch {
        toast("Couldn't save — please retry");
      }
    });
  };

  return (
    <div style={{ minHeight: '100svh', background: 'var(--cream-warm)', padding: '40px 24px' }}>
      <div ref={formRef} style={{ maxWidth: 640, margin: '0 auto' }}>
        <Link href="/organizer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--mocha)', textDecoration: 'none', marginBottom: 16, fontSize: 13 }}>
          <ArrowLeft size={13} /> Back to organizer
        </Link>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 500, marginBottom: 28 }}>Profile</h1>

        <Section title="Identity">
          <Label>Citizenships</Label>
          <MultiCountry
            value={citizenships.map((c) => c.country)}
            onChange={(codes) => {
              const next = codes.map((code) =>
                citizenships.find((c) => c.country === code) ?? { country: code, passportExpiry: null },
              );
              setCitizenships(next);
            }}
          />

          {citizenships.map((c) => (
            <div key={c.country} style={{ marginTop: 10 }}>
              <Label>{c.country} passport expiry (optional)</Label>
              <input
                id={`pass-${c.country}`}
                data-label={`${c.country} passport expiry`}
                type="date"
                value={c.passportExpiry ?? ''}
                onChange={(e) => {
                  setInvalidDateIds((ids) => ids.filter((id) => id !== `pass-${c.country}`));
                  setCitizenships(citizenships.map((x) =>
                    x.country === c.country ? { ...x, passportExpiry: e.target.value || null } : x,
                  ));
                }}
                style={dateInputStyle(invalidDateIds.includes(`pass-${c.country}`))}
              />
            </div>
          ))}

          <Label style={{ marginTop: 16 }}>Country of residence</Label>
          <SingleCountry
            value={residence?.country ?? null}
            onChange={(v) => setResidence(v ? { country: v, visaStatus: residence?.visaStatus ?? null } : null)}
          />

          {residence && (
            <>
              <Label style={{ marginTop: 12 }}>Visa status in this country (optional)</Label>
              <select
                value={residence.visaStatus ?? ''}
                onChange={(e) => setResidence({ ...residence, visaStatus: (e.target.value || null) as 'tourist' | 'permanent' | 'digital-nomad' | 'work' | 'other' | null })}
                style={inputStyle}
              >
                <option value="">— none —</option>
                <option value="tourist">Tourist</option>
                <option value="permanent">Permanent resident</option>
                <option value="digital-nomad">Digital-nomad visa</option>
                <option value="work">Work visa</option>
                <option value="other">Other</option>
              </select>
            </>
          )}

          <Label style={{ marginTop: 16 }}>Has minors</Label>
          <YesNo value={hasMinors} onChange={setHasMinors} />
        </Section>

        <Section title="Driving">
          <Label>IDP convention</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            {([null, '1949', '1968'] as const).map((v) => (
              <button key={String(v)} type="button" onClick={() => setConv(v)} style={segStyle(conv === v)}>
                {v ?? 'None'}
              </button>
            ))}
          </div>
          <Label style={{ marginTop: 16 }}>IDP expiry</Label>
          <input
            id="idp-expiry"
            data-label="IDP expiry"
            type="date"
            value={expiry ?? ''}
            onChange={(e) => { setInvalidDateIds((ids) => ids.filter((id) => id !== 'idp-expiry')); setExpiry(e.target.value || null); }}
            style={dateInputStyle(invalidDateIds.includes('idp-expiry'))}
          />
        </Section>

        <Section title="Health">
          <Label>Controlled medications</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {meds.map((m) => (
              <span key={m} style={chipStyle}>
                {m}
                <button type="button" aria-label={`Remove ${m}`} onClick={() => setMeds(meds.filter((x) => x !== m))} style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mocha)' }}>×</button>
              </span>
            ))}
          </div>
          <input
            value={medDraft}
            onChange={(e) => setMedDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && medDraft.trim()) {
                e.preventDefault();
                setMeds([...meds, medDraft.trim()]);
                setMedDraft('');
              }
            }}
            placeholder="Type and press Enter"
            style={inputStyle}
          />
        </Section>

        <button type="button" onClick={save} disabled={pending} style={{ ...primaryBtn, marginTop: 8 }}>
          {pending ? 'Saving…' : 'Save profile'}
        </button>

        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginTop: 40, marginBottom: 16 }}>Advanced</h2>
        {T2.map((s) => (
          <div key={s.title} style={{ ...sectionStyle, opacity: 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <strong style={{ fontSize: 14 }}>{s.title}</strong>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--sand)', color: 'var(--mocha)' }}>Coming soon</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--mocha)' }}>{s.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 14 }}>{title}</h2>
      {children}
    </div>
  );
}
function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--mocha)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, ...style }}>{children}</div>;
}
function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[{ k: true, l: 'Yes' }, { k: false, l: 'No' }].map((o) => (
        <button key={o.l} type="button" onClick={() => onChange(o.k)} style={segStyle(value === o.k)}>{o.l}</button>
      ))}
    </div>
  );
}
function MultiCountry({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {value.map((c) => (
          <span key={c} style={chipStyle}>
            {c}
            <button type="button" aria-label={`Remove ${c}`} onClick={() => onChange(value.filter((x) => x !== c))} style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mocha)' }}>×</button>
          </span>
        ))}
      </div>
      <select onChange={(e) => { if (e.target.value && !value.includes(e.target.value)) onChange([...value, e.target.value]); e.target.value = ''; }} style={inputStyle} defaultValue="">
        <option value="" disabled>Add a country</option>
        {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
    </div>
  );
}
function SingleCountry({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} style={inputStyle}>
      <option value="">— select —</option>
      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
    </select>
  );
}

const sectionStyle: React.CSSProperties = { background: 'white', borderRadius: 18, padding: 28, marginBottom: 18, boxShadow: '0 2px 12px rgba(0,0,0,.04)' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(253,251,247,.7)', border: '1.5px solid rgba(148,139,130,.18)', borderRadius: 10, padding: '11px 14px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--charcoal)', outline: 'none', boxSizing: 'border-box' };
const dateInputStyle = (invalid: boolean): React.CSSProperties =>
  invalid ? { ...inputStyle, borderColor: '#c0392b', background: 'rgba(192,57,43,.05)' } : inputStyle;
const segStyle = (active: boolean): React.CSSProperties => ({ padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500, border: '1.5px solid ' + (active ? 'var(--charcoal)' : 'rgba(148,139,130,.22)'), background: active ? 'var(--charcoal)' : 'transparent', color: active ? 'var(--cream)' : 'var(--charcoal)', cursor: 'pointer' });
const chipStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'var(--sand)', fontSize: 12.5, color: 'var(--charcoal)' };
const primaryBtn: React.CSSProperties = { padding: '12px 26px', borderRadius: 999, border: 'none', background: 'linear-gradient(135deg, var(--sage) 0%, var(--ocean) 100%)', color: 'var(--cream)', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
