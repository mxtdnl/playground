// Offline interpreter accuracy test.
// Each case: student-style text, archetype ids expected to START, ids expected
// to STOP (given the active list), and whether an out-of-scope flag is expected.
// Usage: node sales-sim/tests/matcher.test.mjs
import { SIM } from './load-engine.mjs';

const cases = [
  ['Pair every new SDR with Priya so they can shadow her calls for the first month.', ['buddy']],
  ['Top performers should mentor the new starters and let them listen in on calls.', ['buddy']],
  ['Every Friday afternoon the whole floor reviews two recorded calls together, led by Dan.', ['gametape']],
  ['We will run a weekly call clinic where people play back their calls and get feedback from peers.', ['gametape']],
  ['Write a playbook of the best objection handling lines and keep it on a shared wiki.', ['playbook']],
  ['Build a library of the best calls so new SDRs can listen on demand.', ['calllibrary']],
  ['Each SDR is paired with a closer who gives feedback on lead quality every week.', ['pods']],
  ['After every deal won or lost the team does a quick debrief on why.', ['winloss']],
  ['Set up peer coaching circles with one person from each team, meeting fortnightly.', ['peercoach']],
  ['Run lunch and learns on discovery questions twice a month.', ['training']],
  ['Move the desks so SDRs sit next to the closers instead of in their own column.', ['reseat']],
  ['Mark should leave his office and sit on the floor with the teams.', ['mgrfloor']],
  ['Put photos of the team and recent wins up on a culture wall.', ['culturewall']],
  ['Ring the bell for every meeting booked, not just closed deals.', ['bell']],
  ['Monthly team socials mixing the four teams, like a quiz or a ping pong tournament.', ['socials']],
  ['Take everyone on an away day to reset goals.', ['awayday']],
  ['Get the Global Sales Director to visit monthly and hold a town hall with juniors.', ['senior']],
  ['Every manager holds weekly one-to-ones with each rep focused on personal development plans.', ['oneonones']],
  ['Managers will hold 1:1s every week with their team.', ['oneonones']],
  ['Send the team managers on a coaching course so they learn how to give feedback.', ['coachtrain']],
  ['Mark holds skip-level coffee chats with the SDRs every month.', ['skiplevel']],
  ['Take the reporting admin off the SDR manager so Kate has time to coach.', ['sdrmgrsupport']],
  ['Managers share their 360 feedback results with their teams and commit to two changes.', ['act360']],
  ['Start an SDR of the month award with peer nominations and specific shout-outs.', ['recognition']],
  ['Introduce shared team goals alongside individual targets.', ['teamtargets']],
  ['Replace Rob as the Team C manager.', ['replacemgr']],
  ['Steve should mentor the other managers in a fortnightly manager forum.', ['mgrmentor']],
  ['Publish a clear progression framework with promotion and demotion criteria.', ['progression']],
  ['Anyone who gets demoted gets a supportive recovery plan to get back on track.', ['recovery']],
  ['Only promote when there is a seat available at the next level.', ['seatpromote']],
  ['Redefine the senior SDR role so it means mentoring the new SDRs.', ['seniorsdr']],
  ['Get rid of the senior SDR title, it causes resentment.', ['seniorsdr']],
  ['Create a career path from SDR to closer within 12 months.', ['careerpath']],
  ['Change the interview process to include a role-play and a realistic job preview.', ['interviews']],
  ['Hire for attitude and coachability rather than experience.', ['coachable']],
  ['Build a six-week onboarding academy for new starters.', ['academy']],
  ['Hire SDRs in cohorts of three who start together.', ['cohort']],
  ['Launch an employee referral scheme.', ['referral']],
  ['Raise the bar on hiring even if seats stay empty for longer.', ['slowhire']],
  ['Protected power hours from 9 to 11 for calling with no meetings, and everyone finishes by 5:30.', ['callblocks']],
  ['No more long hours: people finish at 5.30.', ['callblocks'], [], false, ['longhours']],
  ['Hold stay interviews to find out what would make people leave.', ['stayint']],
  ['Introduce mental health first aiders and wellbeing check-ins.', ['wellbeing']],
  ['Take admin off the top performers and spread the leads more fairly.', ['workload']],
  ['Run a weekly sales competition with a prize for the top seller.', ['competition']],
  ['Every SDR must make 80 calls a day minimum.', ['callquota']],
  ['Put the bottom performers on PIPs and fire anyone who misses target twice.', ['culling']],
  ['Free pizza every Friday.', ['pizza']],
  ['Name and shame the bottom of the table on a big screen.', ['shameboard']],
  ['Bring in a motivational speaker.', ['speaker']],
  ['Weekend calling blitzes until we hit the number.', ['longhours']],
  ['We need more dashboards and better CRM hygiene.', ['overreport']],
  // stops (with active initiatives)
  ['Stop the sales competitions, they are hurting teamwork.', [], ['competition'], false, [], ['competition']],
  ['Scrap the daily call quotas.', [], ['callquota'], false, [], ['callquota']],
  ['Replace the competitions with shared team goals.', ['teamtargets'], ['competition'], false, [], ['competition']],
  // out of scope
  ['Give the SDRs a pay rise.', [], [], true],
  ['Increase commission for the closers.', [], [], true],
  ['Lower the targets for the SDRs.', [], [], true],
  ['Offer customers a discount to close faster.', [], [], true],
  ['Hire more SDRs so we have more capacity.', [], [], true],
  ['Spend more on marketing to get more inbound leads.', [], [], true],
  // combinations
  ['Move SDRs to sit with closers, and every Friday the top closer runs a call review for everyone.', ['reseat', 'gametape']],
  ['Kate runs weekly 1:1s with each SDR and we publish clear promotion criteria.', ['oneonones', 'progression']],
];

let pass = 0, fail = 0;
for (const [text, starts, stops = [], oos = false, mustNot = [], active = []] of cases) {
  const game = SIM.createGame('t');
  for (const id of active) game.inits.push({ id, start: 0, intensity: 0.75, specificity: 0.5, scope: 'office', cadence: 'weekly' });
  const r = SIM.interpretOffline(text, game);
  const gotStart = r.items.filter((i) => i.action === 'start').map((i) => i.id);
  const gotStop = r.items.filter((i) => i.action === 'stop').map((i) => i.id);
  const errs = [];
  for (const id of starts) if (!gotStart.includes(id)) errs.push('missing start ' + id);
  for (const id of stops) if (!gotStop.includes(id)) errs.push('missing stop ' + id);
  for (const id of mustNot) if (gotStart.includes(id)) errs.push('should not start ' + id);
  if (oos && !r.outOfScope.length) errs.push('missing out-of-scope flag');
  if (!oos && r.outOfScope.length) errs.push('unexpected out-of-scope: ' + r.outOfScope[0].reason);
  const extra = gotStart.filter((id) => !starts.includes(id));
  if (errs.length) { fail++; console.log('FAIL', JSON.stringify(text), errs.join('; '), extra.length ? '(also: ' + extra.join(',') + ')' : ''); }
  else { pass++; if (extra.length) console.log('ok+extra', JSON.stringify(text), extra.join(',')); }
}
const rate = pass / (pass + fail);
console.log(`\n${pass}/${pass + fail} correct (${(rate * 100).toFixed(0)}%)`);

// Specificity: a detailed plan should score higher than a vague one
const vague = SIM.interpretOffline('Improve the culture and do some training.', SIM.createGame('t')).items[0];
const precise = SIM.interpretOffline('Dan runs a weekly training session on objection handling for all SDRs, and we track meetings booked per SDR.', SIM.createGame('t')).items[0];
const specOk = vague && precise && precise.specificity > vague.specificity + 0.3;
console.log((specOk ? 'PASS' : 'FAIL') + ' specificity: vague ' + (vague && vague.specificity) + ' vs precise ' + (precise && precise.specificity));

// Claude reply validation
const g = SIM.createGame('t');
const good = SIM.normalizeInterpretation({ items: [{ action: 'start', id: 'buddy', intensity: 3, scope: 'nowhere', cadence: 'hourly', specificity: -2, quote: 'x' }, { action: 'start', id: 'not_a_real_id' }, { action: 'stop', id: 'competition' }], outOfScope: ['pay rise', { quote: 'q', reason: 'r' }], unclear: [5, 'hmm'], reaction: 'ok' }, g);
const vOk = good.items.length === 1 && good.items[0].intensity === 1 && good.items[0].scope === 'sdr' && good.items[0].cadence === 'unspecified' && good.items[0].specificity === 0.1 && good.outOfScope.length === 2 && good.unclear.length === 1;
console.log((vOk ? 'PASS' : 'FAIL') + ' reply validation clamps values and drops unknown ids and invalid stops');
let threw = false; try { SIM.normalizeInterpretation('nope', g); } catch (e) { threw = true; }
console.log((threw ? 'PASS' : 'FAIL') + ' non-object reply is rejected');

process.exitCode = rate >= 0.8 && specOk && vOk && threw ? 0 : 1;
