import { describe, it, expect } from 'vitest';
import { resolvePreflightJP } from '@/lib/rules/jp/preflight';
import type { Facts, Leg } from '@/lib/rules/types';

const baseLeg: Leg = { from: 'US', to: 'JP', startDate: '2026-06-01', endDate: '2026-06-02' };

function makeFacts(overrides: Partial<Facts>): Facts {
  return {
    citizenships: [{ country: 'US', passportExpiry: '2029-08-15' }],
    residence: { country: 'US', visaStatus: null },
    controlledMeds: [],
    hasMinors: false,
    idp1949Valid: false,
    idp1968Valid: false,
    travelingWithMinors: false,
    drivingAtDestination: false,
    carryingControlledMeds: false,
    fromCountry: baseLeg.from,
    toCountry: baseLeg.to,
    stayDays: 1,
    leg: baseLeg,
    tables: {},
    ...overrides,
  };
}

describe('resolvePreflightJP n-pass info card', () => {
  it('passes for a US passport valid well past return + 6mo', () => {
    const out = resolvePreflightJP(makeFacts({}));
    const pass = out.info['n-pass'];
    expect(pass).toBeDefined();
    expect(pass.state).toBe('pass');
    expect(pass.title).toMatch(/^US Passport · valid /);
    expect(pass.ruleId).toBe('jp.preflight.pass.valid');
  });

  it('fails when passport expires before return + 6mo', () => {
    const out = resolvePreflightJP(makeFacts({
      citizenships: [{ country: 'US', passportExpiry: '2026-08-01' }],
      leg: { ...baseLeg, endDate: '2026-06-02' },
    }));
    const pass = out.info['n-pass'];
    expect(pass).toBeDefined();
    expect(pass.state).toBe('fail');
    expect(pass.ruleId).toBe('jp.preflight.pass.expires-too-soon');
    expect(pass.title).toMatch(/^US Passport · expires /);
  });

  it('warns when passport has no expiry recorded', () => {
    const out = resolvePreflightJP(makeFacts({
      citizenships: [{ country: 'US', passportExpiry: null }],
    }));
    const pass = out.info['n-pass'];
    expect(pass).toBeDefined();
    expect(pass.state).toBe('warn');
    expect(pass.ruleId).toBe('jp.preflight.pass.no-expiry');
    expect(pass.title).toBe('US Passport · expiry unknown');
  });

  it('warns when profile has no citizenships', () => {
    const out = resolvePreflightJP(makeFacts({ citizenships: [] }));
    const pass = out.info['n-pass'];
    expect(pass).toBeDefined();
    expect(pass.state).toBe('warn');
    expect(pass.ruleId).toBe('jp.preflight.pass.missing');
    expect(pass.title).toBe('No passport on file');
  });

  it('emits "MY Passport · ..." when primary citizenship is MY', () => {
    const out = resolvePreflightJP(makeFacts({
      citizenships: [{ country: 'MY', passportExpiry: '2030-01-15' }],
    }));
    expect(out.info['n-pass'].title).toMatch(/^MY Passport · valid /);
  });
});

describe('resolvePreflightJP n-visa decision — no fail-open (issue #22)', () => {
  const usExempt = { visa_exemption: { 'US:JP': { exemptDays: 90 } } } as Facts['tables'];

  it("resolves n-visa to 'no' (exempt) when an exemption rule proves it", () => {
    const out = resolvePreflightJP(makeFacts({ stayDays: 9, tables: usExempt }));
    expect(out.choices['n-visa']).toBeDefined();
    expect(out.choices['n-visa'].choiceId).toBe('no');
  });

  it("never resolves to 'no' for a non-exempt citizenship with no matching rule", () => {
    // Philippines passport; only US:JP exemption exists in the tables.
    const out = resolvePreflightJP(makeFacts({
      citizenships: [{ country: 'PH', passportExpiry: '2030-01-01' }],
      stayDays: 9,
      tables: usExempt,
    }));
    expect(out.choices['n-visa']).toBeDefined();          // must emit an explicit verdict
    expect(out.choices['n-visa'].choiceId).not.toBe('no'); // not silently visa-exempt
    expect(out.choices['n-visa'].choiceId).toBe('yes');
  });

  it("never resolves to 'no' when the stay exceeds the exempt window", () => {
    const out = resolvePreflightJP(makeFacts({ stayDays: 120, tables: usExempt }));
    expect(out.choices['n-visa']).toBeDefined();
    expect(out.choices['n-visa'].choiceId).toBe('yes');
  });

  it("never resolves to 'no' when exemption data is unavailable (lookup failed / empty tables)", () => {
    const out = resolvePreflightJP(makeFacts({ stayDays: 9, tables: {} }));
    expect(out.choices['n-visa']).toBeDefined();
    expect(out.choices['n-visa'].choiceId).toBe('yes');
  });
});
