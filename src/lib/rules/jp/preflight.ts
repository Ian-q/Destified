import type { FlowResolver, ResolverOutput } from '../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function addMonthsISO(iso: string, months: number): string {
  const [yStr, mStr, dStr] = iso.split('-');
  const y = +yStr, m = +mStr, d = +dStr;
  const targetMidx0 = m - 1 + months;
  const targetY = y + Math.floor(targetMidx0 / 12);
  const targetM = ((targetMidx0 % 12) + 12) % 12 + 1;
  return `${targetY}-${String(targetM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatMonthYear(iso: string): string {
  const [y, m] = iso.split('-');
  return `${MONTH_NAMES[+m - 1]} ${y}`;
}

export const resolvePreflightJP: FlowResolver = (f): ResolverOutput => {
  const out: ResolverOutput = { choices: {}, info: {} };

  // n-visa — table-driven across citizenships.
  // Only emit the visa-exempt branch when a rule actually proves exemption.
  // When nothing proves it, emit an explicit "verify" verdict rather than
  // staying silent — silence would let the graph's optimistic `on:true`
  // default ("No · exempt") win, falsely telling non-exempt travellers they
  // need no visa (issue #22).
  for (const c of f.citizenships) {
    const visa = f.tables.visa_exemption?.[`${c.country}:${f.toCountry}`];
    if (visa && visa.exemptDays !== null && f.stayDays <= visa.exemptDays) {
      out.choices['n-visa'] = {
        choiceId: 'no',
        ruleId:   `jp.preflight.visa.${c.country.toLowerCase()}-exempt`,
        reason:   `${c.country} passport, ${f.stayDays}-night stay → visa-exempt up to ${visa.exemptDays} days`,
      };
      break;
    }
  }
  if (!out.choices['n-visa']) {
    const primaryCountry = f.citizenships[0]?.country;
    out.choices['n-visa'] = {
      choiceId: 'yes',
      ruleId:   'jp.preflight.visa.unverified',
      reason:   primaryCountry
        ? `Couldn't confirm visa-exemption for a ${primaryCountry} passport → ${f.toCountry} (${f.stayDays}-night stay). Verify entry requirements with the embassy before booking.`
        : `Couldn't confirm visa requirements for ${f.toCountry}. Verify entry requirements with the embassy before booking.`,
    };
  }

  // n-meds
  if (f.carryingControlledMeds && f.controlledMeds.length > 0) {
    out.choices['n-meds'] = {
      choiceId: 'yes-controlled',
      ruleId:   'jp.preflight.meds.controlled',
      reason:   `${f.controlledMeds.join(', ')} requires a Yakkan Shoumei import certificate`,
    };
  } else if (f.carryingControlledMeds === false) {
    out.choices['n-meds'] = {
      choiceId: 'no',
      ruleId:   'jp.preflight.meds.none',
      reason:   'No prescription meds declared for this trip',
    };
  }

  // n-kids
  if (f.travelingWithMinors === false) {
    out.choices['n-kids'] = {
      choiceId: 'no',
      ruleId:   'jp.preflight.kids.none',
      reason:   'No minors on this trip',
    };
  }

  // n-drive — IDP logic
  if (f.drivingAtDestination === false) {
    out.choices['n-drive'] = {
      choiceId: 'no',
      ruleId:   'jp.preflight.drive.no',
      reason:   'Not driving in Japan — trains only',
    };
  } else if (f.drivingAtDestination && f.idp1949Valid) {
    out.choices['n-drive'] = {
      choiceId: 'yes',
      ruleId:   'jp.preflight.drive.idp1949',
      reason:   'Driving in Japan; you have a valid 1949-convention IDP',
    };
  }

  // n-pass — passport validity check against trip return + 6 months
  const primary = f.citizenships[0];
  const sixMonthsAfterReturn = addMonthsISO(f.leg.endDate, 6);

  if (!primary) {
    out.info['n-pass'] = {
      title: 'No passport on file',
      desc:  'Add a citizenship to your profile to enable identity checks.',
      meta:  'Profile incomplete',
      state: 'warn',
      ruleId: 'jp.preflight.pass.missing',
      reason: 'No citizenships in profile',
    };
  } else if (!primary.passportExpiry) {
    out.info['n-pass'] = {
      title: `${primary.country} Passport · expiry unknown`,
      desc:  `Confirm your passport is valid 6+ months past return (${formatMonthYear(sixMonthsAfterReturn)}).`,
      meta:  'Add expiry in profile to auto-check',
      state: 'warn',
      ruleId: 'jp.preflight.pass.no-expiry',
      reason: `${primary.country} citizenship has no expiry recorded`,
    };
  } else if (primary.passportExpiry >= sixMonthsAfterReturn) {
    out.info['n-pass'] = {
      title: `${primary.country} Passport · valid ${formatMonthYear(primary.passportExpiry)}`,
      desc:  `Japan requires 6 months past return — you have headroom past ${formatMonthYear(sixMonthsAfterReturn)}. ✓ passed.`,
      meta:  'Auto-checked from profile',
      state: 'pass',
      ruleId: 'jp.preflight.pass.valid',
      reason: `${primary.country} passport expires ${primary.passportExpiry}, ≥ 6mo after return`,
    };
  } else {
    out.info['n-pass'] = {
      title: `${primary.country} Passport · expires ${formatMonthYear(primary.passportExpiry)}`,
      desc:  `Japan requires validity 6+ months past return (${formatMonthYear(sixMonthsAfterReturn)}). Renew before flying.`,
      meta:  'Auto-check failed',
      state: 'fail',
      ruleId: 'jp.preflight.pass.expires-too-soon',
      reason: `${primary.country} passport expires ${primary.passportExpiry}, < 6mo after return`,
    };
  }

  return out;
};
