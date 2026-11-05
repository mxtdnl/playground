// Turn the Page — case file: Maya, 16.
//
// DATA ONLY. No logic belongs in this file (CLAUDE.md, SPEC.md 14.1).
// You can edit any text between quotes without touching code. After editing,
// run `node build.mjs` from turn-the-page/, then `node --test` and
// `node tests/calibrate.mjs`, then `node tests/export-review.mjs` to refresh
// docs/CONTENT-REVIEW.md. Changing an `override` or a `next` changes the
// numbers, so re-run the calibrator before committing.
//
// Text conventions: UK English; straight quotes; speech inside reactions in
// double quotes. Anything uncertain starts "PLACEHOLDER:".
//
// How a node works:
//   page      the page number shown in the book (unique, non-sequential)
//   act       1, 2 or 3
//   scene     optional pose hints for the illustration (session 4), e.g.
//             gaze: 'floor' | 'door' | 'phone' | 'counsellor' | 'window'
//             arms: 'crossed' | 'bag' | 'lap' | 'open' | 'gesturing'
//             chair: 'edge' | 'back' | 'leaningIn'; props: ['phone', 'brochure']
//   line      what Maya says when the page opens
//   cue       what the counsellor can see (Observe has something to work with)
//   next      where the page leads after a choice: a node id, null (the round
//             ends), an object keyed by lever (with a `default`), or a list of
//             { to, if: { trust: { min } } } checked on the meters AFTER the choice
//   options   eight in Round 1 (four levers x skilful/clumsy), four in Round 2
//
// How an option works:
//   id        unique within its node ('q-s' = question/skilful ... 'c-c'; Round 2: 'q', 's', 'o', 'c')
//   lever     'question' | 'support' | 'observe' | 'challenge'
//   quality   Round 1 only: 'skilful' or 'clumsy'
//   text      what the counsellor says
//   reaction  Maya's reaction; `default` is what Maya says. Variants keyed
//             'trait:band' (for example 'readiness:mid') replace it when the
//             student's trait has that band. Maya's own bands are in the profile;
//             variants for other bands are written for future profiles.
//   pose      optional pose hints for the consequence picture, when the reaction
//             describes something visible (same values as a page's scene.pose;
//             props: [] puts the phone away). Unset parameters follow the meters.
//   override  optional hand-tuned adjustment, -5 to +5 per meter, used when the
//             specific words fit (or misfit) the moment. Every override is
//             listed in docs/CONTENT-REVIEW.md for review.
//   debrief   the note shown in the debrief, written as a trade-off
//             (never "correct", "wrong", "optimal" or "should have")

export const MAYA = {
  id: 'maya',
  version: 1,

  // Who Maya is (SPEC.md 6.2). Traits are hidden during play and revealed
  // in the debrief. Bands: 'low', 'mid', 'high'.
  profile: {
    name: 'Maya',
    age: 16,
    stage: 'Two years before finishing secondary school; starting to think about university and career options',
    context: [
      'Her grades have dropped this term across several subjects.',
      'She used to participate actively in class.',
      'Her family expects (unspoken in Round 1) that she will study medicine.'
    ],
    traits: {
      confidence: 'low',
      extraversion: 'mid', // currently suppressed
      defensiveness: 'mid',
      readiness: 'low' // rises to 'mid' in Round 2 after a Breakthrough or Partial ending
    },
    start: { trust: 35, confidence: 30, ownership: 15 },
    poseBias: 'guarded'
  },

  // The note the counsellor reads before Round 1 (SPEC.md 6.3).
  referral: {
    title: 'Referral — Student Support',
    student: 'Maya, 16 · two years before finishing secondary school',
    from: 'Mr Okafor, Maths teacher',
    text: 'Maya\'s grades have dropped noticeably this term across several subjects. She used to participate actively but has gone quiet in class and has missed two homework deadlines. When I asked, she said she\'s "just being lazy." I don\'t think that\'s the full story. Could you have a conversation with her?',
    // Phrases in the note that hint at a trait; Debrief 1 maps each one.
    hints: [
      { text: 'She used to participate actively but has gone quiet in class', trait: 'extraversion', note: 'Extraversion: mid, currently suppressed. She is not a naturally quiet student; something has made her withdraw. Open questions yield more once trust is in place.' },
      { text: 'she said she\'s "just being lazy."', trait: 'confidence', note: 'Self-confidence: low. She reaches for a harsh label for herself, so Support tends to be needed before a Challenge can land.' },
      { text: 'When I asked, she said', trait: 'defensiveness', note: 'PLACEHOLDER: Defensiveness: mid. She answered a teacher\'s question with a ready-made explanation that closes the subject: protective, but not hostile. This is the weakest of the four hints; confirm with the SME or strengthen the note.' },
      { text: 'has missed two homework deadlines', trait: 'readiness', note: 'Readiness for change: low. The pattern is established and she has not yet tried to change it, so Ownership builds slowly in the first act.' }
    ]
  },

  rounds: {

    // ---------------------------------------------------------------------
    // ROUND 1 — "Just lazy". Format B: pick a lever, then one of two wordings.
    // Act 1 is two shared pages; Acts 2 and 3 branch by lever and by Trust,
    // then rejoin at a shared page (r1-05, r1-07). Seven decisions per path.
    r1: {
      title: 'Just lazy',
      format: 'B',
      start: 'r1-01',
      // Act titles and the cliffhanger line shown on the act banner at the end of each act.
      acts: {
        1: { title: 'Opening', cliffhanger: 'She looked at the door. Then she looked back at you.' },
        2: { title: 'Exploration', cliffhanger: 'Everyone had decided. Nobody had asked her.' },
        3: { title: 'Turning point', cliffhanger: 'The bell was about to ring. Whatever happened next would be hers, or nobody\'s.' }
      },
      nodes: {
        'r1-01': {
          page: 7,
          act: 1,
          scene: { pose: { gaze: 'door', arms: 'bag', chair: 'edge', shoulders: 'raised' } },
          line: 'Mr Okafor sent me. I know — my grades. I\'m just being lazy.',
          cue: 'She sits on the edge of the chair nearest the door, bag strap still in her hand. She said it before you asked anything.',
          next: 'r1-02',
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              pose: { chair: 'back' },
              text: 'Thanks for coming. Before we get to grades, how has this term been for you?',
              reaction: {
                default: 'She shrugs. "Fine. Busy. I don\'t know." But she sits back a little.',
                'extraversion:high': '"Honestly? Weird." She starts to say more, then stops herself.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'An open start that put her experience before the grades. It gave her room, though at this point she had little to fill it with.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              pose: { gaze: 'floor' },
              text: 'Why do you think you\'ve been lazy?',
              reaction: {
                default: '"I just am. I don\'t know." She looks at the floor.'
              },
              debrief: 'Leading: it took her word "lazy" as the starting point. You got an answer quickly, and it kept her inside her own label.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { shoulders: 'relaxed', gaze: 'counsellor' },
              text: 'Thanks for coming in. You\'re not in trouble. I\'d just like to hear how things are from your side.',
              reaction: {
                default: '"OK." Her shoulders come down a little. She looks at you properly for the first time.',
                'defensiveness:high': '"That\'s what everyone says." But she stays in the chair.'
              },
              override: { trust: 4 },
              debrief: 'Lowered the stakes before anything else. Trust rose quickly; she had not yet done any of the thinking.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              pose: { mouth: 'slightSmile' },
              text: 'Oh, I\'m sure you\'re not lazy at all!',
              reaction: {
                default: '"You don\'t know that." A half-smile, as if you have missed the point.'
              },
              debrief: 'Warm, but premature: it contradicted her before you had heard her. The reassurance arrived before any understanding.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { arms: 'lap' },
              text: 'You said that very quickly, before I\'d asked anything. It sounds like you\'ve had that conversation a few times already.',
              reaction: {
                default: 'She blinks. "I mean... yeah. Everyone keeps saying it." She lets go of the bag strap.',
                'defensiveness:high': '"So?" She grips the strap tighter, but she is listening.'
              },
              override: { trust: 5, ownership: 3 },
              debrief: 'Named something real in what she said, without judging it. At low trust an observation can feel exposing; this one was gentle enough to open a door.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { arms: 'bag' },
              text: 'You look like you really don\'t want to be here.',
              reaction: {
                default: '"Well, I didn\'t ask to come." She pulls the bag closer.'
              },
              debrief: 'An honest observation, delivered as a judgement about her. It was accurate, and it put her on the defensive.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { arms: 'crossed', mouth: 'tight' },
              text: '"Lazy" is one explanation. I\'m not sure it\'s the whole one.',
              reaction: {
                default: 'She frowns. "What else would it be?" Her arms fold.',
                'confidence:high': 'She tilts her head. "Go on, then. What else?"'
              },
              override: { ownership: 2 },
              debrief: 'A thoughtful reframe, offered before there was trust to hold it. It planted a seed and cost some rapport.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { arms: 'crossed', mouth: 'tight' },
              text: 'Are you, though?',
              reaction: {
                default: 'She folds her arms. "Yes." The room goes quiet.'
              },
              override: { trust: -2 },
              debrief: 'Direct and quick. It questioned her before she felt safe, and she closed the topic down.'
            }
          ]
        },
        'r1-02': {
          page: 12,
          act: 1,
          scene: { pose: { gaze: 'counsellor', arms: 'bag', chair: 'edge' } },
          line: 'So what is this, then? Like, a warning?',
          cue: 'The bag is off her shoulder now, but it is on her lap, both hands on it.',
          next: { question: 'r1-03a', support: 'r1-03b', observe: 'r1-03c', challenge: 'r1-03d', default: 'r1-03a' },
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'What would you want to get out of talking today, if anything?',
              reaction: {
                default: '"I don\'t know. Not being nagged, I guess." She thinks. "Maybe working out why I can\'t just... do stuff."'
              },
              override: { trust: 1, ownership: 5 },
              debrief: 'Asked her to set the purpose of the conversation. It handed her some ownership early, though she had to think on the spot.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Shall we make a plan to get your grades back up?',
              reaction: {
                default: '"I guess." She says it as if she has said it many times before.'
              },
              debrief: 'A closed question with your agenda inside it. She agreed; the purpose was yours, not hers.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { arms: 'lap' },
              text: 'It\'s not a warning. It\'s just a chance to talk about how things are going, at whatever pace suits you.',
              reaction: {
                default: '"OK." She puts the bag down on the floor.'
              },
              override: { trust: 5 },
              debrief: 'Removed the threat and let her set the pace. Trust rose; the purpose of the conversation stayed vague.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              pose: { mouth: 'flat' },
              text: 'Don\'t worry, we\'ll have you back on track in no time.',
              reaction: {
                default: '"Right." She does not look convinced.'
              },
              override: { ownership: -2 },
              debrief: 'Rescuing: it promised an outcome and took the problem onto your shoulders. Kind, and it left her nothing to do.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              text: 'You asked if it\'s a warning. It sounds like you\'re expecting to be in trouble.',
              reaction: {
                default: '"Aren\'t I?" A pause. "Everyone\'s been on at me."',
                'extraversion:low': 'She nods, once, and says nothing.'
              },
              override: { trust: 3, ownership: 3 },
              debrief: 'Reflected her own words back. It showed you were listening and let her name what she was afraid of.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { arms: 'bag', mouth: 'tight' },
              text: 'You seem very defensive.',
              reaction: {
                default: '"I\'m not defensive." Her hands tighten on the bag.'
              },
              debrief: 'Labelled her rather than describing what you saw or heard. A label is easy to argue with, and she did.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { head: 'up', gaze: 'counsellor' },
              text: 'I don\'t think Mr Okafor sees this as a warning. He told me he doesn\'t think "lazy" is the full story.',
              reaction: {
                default: 'She looks up. "He said that?" She does not seem to know what to do with it.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Offered a different view of why she was here. It questioned her story about being in trouble; how it landed depended on the trust built so far.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'door' },
              text: 'Well, two missed deadlines is a pretty serious warning sign.',
              reaction: {
                default: '"So it is a warning." She looks at the door.'
              },
              override: { trust: -2 },
              debrief: 'Judgemental: it confirmed her fear before exploring it. The facts were accurate; the framing turned them into a verdict.'
            }
          ]
        },
        'r1-03a': {
          page: 19,
          act: 2,
          scene: { pose: { gaze: 'floor', arms: 'lap' } },
          line: 'I don\'t know. I stay up really late. Then I\'m too tired to start anything, so I don\'t.',
          cue: 'She picks at the strap of her bag while she talks.',
          next: [{ to: 'r1-04a', if: { trust: { min: 45 } } }, { to: 'r1-04b' }],
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'What\'s happening in those late evenings?',
              reaction: {
                default: '"Nothing. Phone. Videos. Just... not thinking." She stops. "That sounds bad."',
                'extraversion:high': '"Oh, everything. Videos, messages, then it\'s one o\'clock." She laughs, then doesn\'t.'
              },
              override: { trust: 2, ownership: 4 },
              debrief: 'Followed her own words into the detail. She explored, and noticed something about herself.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              pose: { arms: 'lap' },
              text: 'Have you tried going to bed earlier?',
              reaction: {
                default: '"Yeah. Obviously." She stops picking at the strap.'
              },
              debrief: 'Closed and premature: it jumped to a solution she had already thought of. It ended the exploring.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { shoulders: 'relaxed' },
              text: 'That sounds exhausting. Tired, and then annoyed with yourself for being tired.',
              reaction: {
                default: '"Yeah. Exactly that." She sighs.'
              },
              override: { trust: 3 },
              debrief: 'Named the feeling accurately. She felt understood; the conversation stayed with the feeling rather than moving on.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              text: 'Oh, everyone your age stays up too late. It\'s completely normal.',
              reaction: {
                default: '"OK." She seems to have nothing to add.'
              },
              debrief: 'Normalising, but it made her experience ordinary before she had finished describing it.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              text: 'You said "so I don\'t". Not "I can\'t".',
              reaction: {
                default: 'She thinks about it. "I suppose. It\'s easier not to start than to start and be rubbish at it."'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Fed back a detail of her own words. It let her notice a choice inside the habit, and she did the thinking.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { arms: 'lap', shoulders: 'raised' },
              text: 'You obviously aren\'t sleeping enough. You look very tired.',
              reaction: {
                default: '"Thanks." She pulls her sleeves down over her hands.'
              },
              debrief: 'Based on what you could see, but it came out as a comment on her appearance. It stung more than it helped.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              text: 'Being that tired is real. I wonder if "lazy" is the right word for someone who\'s this tired.',
              reaction: {
                default: '"What else would you call it?" But she is thinking about it.'
              },
              override: { ownership: 3 },
              debrief: 'Questioned her label with care. It offered a new frame; whether she could take it depended on the trust built so far.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'window', mouth: 'flat' },
              text: 'Well, that\'s a choice you\'re making every night.',
              reaction: {
                default: '"I know." Flat. She looks away.'
              },
              debrief: 'True, and delivered as a verdict. It handed her the responsibility before she was ready to hold it.'
            }
          ]
        },
        'r1-03b': {
          page: 23,
          act: 2,
          scene: { pose: { gaze: 'floor', arms: 'lap', shoulders: 'neutral' } },
          line: 'It\'s not like I don\'t try. I sit down to do it, and then... I just don\'t start.',
          cue: 'Her shoulders have come down. She is looking at the desk now, not the door.',
          next: [{ to: 'r1-04a', if: { trust: { min: 45 } } }, { to: 'r1-04b' }],
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'What happens in the moment you sit down?',
              reaction: {
                default: '"I look at it and it\'s like... too much. So I do something else."'
              },
              override: { trust: 2, ownership: 4 },
              debrief: 'Slowed down on the exact moment things stall for her. She described it in her own words, which is where ownership starts.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Is it because the work is too hard?',
              reaction: {
                default: '"No. I mean, some of it. I don\'t know."'
              },
              debrief: 'Closed and leading: it offered her an explanation to agree with. She half-agreed, and the real answer stayed hidden.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { head: 'down' },
              text: 'That\'s a horrible feeling, wanting to start and not being able to.',
              reaction: {
                default: '"Yeah." Quietly. "It is."'
              },
              override: { trust: 3 },
              debrief: 'Acknowledged the feeling without hurrying her. Trust grew; nothing new came out yet.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              text: 'Don\'t be so hard on yourself. You\'ll get there.',
              reaction: {
                default: '"Maybe." She does not sound convinced.'
              },
              debrief: 'Encouraging, and it skipped past what she had just told you. Reassurance without understanding can feel like being hurried along.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { head: 'up' },
              text: 'You said "it\'s not like I don\'t try". It sounds like trying matters to you.',
              reaction: {
                default: '"Well, yeah. I\'m not just sitting there doing nothing." She sits up a little.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Reflected back what she valued in her own words. It gave her a better story about herself, and she took it.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { mouth: 'tight' },
              text: 'You look like you\'ve given up on it.',
              reaction: {
                default: '"I haven\'t given up." Sharper than she meant.'
              },
              debrief: 'An observation of her mood turned into a conclusion about her. She defended herself instead of exploring.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'You keep sitting down to do it. That doesn\'t sound like someone who\'s lazy.',
              reaction: {
                default: 'She looks at you. "I suppose not." She does not sound sure.'
              },
              override: { ownership: 4 },
              debrief: 'Pushed back on her label using her own evidence. A strong reframe; it asked her to see herself differently, which takes trust.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { arms: 'crossed' },
              text: 'But sitting there isn\'t enough, is it? You have to actually do it.',
              reaction: {
                default: '"I know that." She folds her arms.'
              },
              debrief: 'A push that told her what she already knew. It put the pressure back on just as she had started to open up.'
            }
          ]
        },
        'r1-03c': {
          page: 26,
          act: 2,
          scene: { pose: { gaze: 'counsellor', arms: 'crossed', shoulders: 'neutral' } },
          line: 'I\'m not expecting trouble. I\'m just tired of everyone asking what\'s wrong.',
          cue: 'The bag is on the floor now. Her arms are loosely crossed.',
          next: [{ to: 'r1-04a', if: { trust: { min: 45 } } }, { to: 'r1-04b' }],
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'What would you want people to understand, instead of asking?',
              reaction: {
                default: '"That I don\'t know what\'s wrong. That\'s the whole thing."'
              },
              override: { trust: 1, ownership: 4 },
              debrief: 'Turned her complaint into something she could say for herself. She answered honestly, and the not-knowing became the subject.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'So is something wrong?',
              reaction: {
                default: '"No. That\'s what I mean." She sighs.'
              },
              debrief: 'The very question she had just said she was tired of. Closed, and it confirmed her point.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { mouth: 'slightSmile' },
              text: 'That sounds tiring. I\'ll try not to be one more person asking the same thing.',
              reaction: {
                default: 'A small laugh. "Thanks."'
              },
              override: { trust: 3 },
              debrief: 'Took her side on the thing she found hard, with a light touch. Trust rose; the exploring waited.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              text: 'Nothing\'s wrong with you. You\'re doing fine.',
              reaction: {
                default: '"My grades say I\'m not."'
              },
              debrief: 'Meant kindly, and easy for her to disprove. Reassurance that does not match the facts tends to cost credibility.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              text: 'You said "everyone". It sounds like it\'s coming from a lot of directions at once.',
              reaction: {
                default: '"Teachers. Home. Everyone." She stops there.'
              },
              override: { trust: 1, ownership: 4 },
              debrief: 'Picked out one word and reflected its weight. She told you more than she meant to, without being asked directly.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { arms: 'crossed' },
              text: 'You\'re very guarded, aren\'t you?',
              reaction: {
                default: '"Not really." Her arms tighten.'
              },
              debrief: 'A label, not an observation. It gave her something to deny rather than something to look at.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'I don\'t think Mr Okafor asked what was wrong to nag you. He noticed you\'d gone quiet, and that\'s not like you.',
              reaction: {
                default: '"He noticed?" Surprised, then wary.'
              },
              override: { ownership: 3 },
              debrief: 'Offered a different reading of the attention she resented. It could reframe the nagging as care, if she trusted you enough to hear it.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'window' },
              text: 'People ask because your grades have dropped. That\'s fair, isn\'t it?',
              reaction: {
                default: '"I didn\'t say it wasn\'t fair." She looks away.'
              },
              debrief: 'Defended the people asking rather than exploring her experience of it. She felt contradicted and pulled back.'
            }
          ]
        },
        'r1-03d': {
          page: 31,
          act: 2,
          scene: { pose: { gaze: 'door', arms: 'crossed', shoulders: 'raised', mouth: 'tight' } },
          line: 'Whatever. I\'m just not bothered any more. It\'s pointless anyway.',
          cue: 'Her arms are folded. She is looking at the clock above the door.',
          next: [{ to: 'r1-04a', if: { trust: { min: 45 } } }, { to: 'r1-04b' }],
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'What\'s made it feel pointless?',
              reaction: {
                default: 'A long pause. "I don\'t know. It just does."'
              },
              override: { trust: 2, ownership: 2 },
              debrief: 'Stayed curious after a push had landed badly. It kept the door open, although she was not ready to walk through it.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Don\'t you care about your grades?',
              reaction: {
                default: '"Obviously I care." Too fast.'
              },
              debrief: 'A closed question with an accusation inside it. She gave the expected answer and nothing else.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { gaze: 'counsellor', arms: 'lap' },
              text: 'I pushed a bit fast just then. Sorry. We can slow down.',
              reaction: {
                default: 'She glances at you, surprised. Her arms loosen slightly.'
              },
              override: { trust: 5 },
              debrief: 'Repaired the moment by owning your part in it. Trust recovered; the conversation itself had not moved on yet.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              text: 'Hey, it\'s not pointless! You\'ve got so much potential.',
              reaction: {
                default: '"Everyone says that." She sounds tired.'
              },
              debrief: 'Upbeat, and it argued with her feeling instead of acknowledging it. She had heard it before.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { gaze: 'counsellor', head: 'up' },
              text: 'You said "any more". So there was a time when you were bothered.',
              reaction: {
                default: '"...Yeah. Last year I actually liked school." She looks surprised that she said it.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Caught a small word that carried a lot. It let her remember a different version of herself without being told to.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              text: 'You\'ve folded your arms. I can tell you\'re shutting me out.',
              reaction: {
                default: '"I\'m just sitting here." She does not move.'
              },
              debrief: 'Started with what you saw and finished with a conclusion about her. The conclusion was what she heard.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              text: 'Pointless is a strong word. You still came in today, when you could have not.',
              reaction: {
                default: '"I had to come." But she does not get up.'
              },
              override: { ownership: 3 },
              debrief: 'Offered evidence against her own word. It was a fair push; with trust this low it was always going to cost something.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'door' },
              text: 'That\'s a bit of an excuse, isn\'t it?',
              reaction: {
                default: '"Can you just... not." She looks at the door.'
              },
              debrief: 'Called her feeling an excuse. It pushed hard at the moment she was least able to take it.'
            }
          ]
        },
        'r1-04a': {
          page: 36,
          act: 2,
          scene: { pose: { gaze: 'phone', arms: 'lap', props: ['phone'] } },
          line: 'Like last week. I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
          cue: 'When she mentions next year\'s exams, she takes out her phone and turns it over and over in her hand.',
          next: 'r1-05',
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'What goes through your head when you open it?',
              reaction: {
                default: '"That it\'s going to be rubbish anyway. So why bother."'
              },
              override: { trust: 1, ownership: 4 },
              debrief: 'Went underneath the habit to the thought driving it. She named it herself, which is harder to forget than being told.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              pose: { props: [], gaze: 'floor' },
              text: 'So the phone is the problem, really?',
              reaction: {
                default: '"I guess." She puts it away, as if caught.'
              },
              debrief: 'Leading: it handed her a tidy explanation. She accepted it, and the phone became the culprit instead of the clue.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              text: 'Two hours of avoiding something you\'re dreading. That\'s a hard way to spend an evening.',
              reaction: {
                default: '"It\'s awful, actually. I feel worse after."'
              },
              override: { trust: 3 },
              debrief: 'Recognised how unpleasant the avoiding is. She admitted it out loud; the cue in her hands went unremarked.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              text: 'Everyone puts things off. Don\'t worry about it.',
              reaction: {
                default: '"Yeah, but not every night."'
              },
              debrief: 'Normalised it so quickly that she had to put you right. The kindness made the problem smaller than it was.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { props: [], head: 'down' },
              text: 'I noticed you picked up your phone just as you mentioned next year.',
              reaction: {
                default: 'She looks at it in her hand, then puts it face down on her knee. "I didn\'t even notice."',
                'extraversion:low': 'She stops turning the phone. A long silence. Then a very small nod.'
              },
              override: { trust: 4, ownership: 5 },
              debrief: 'Used a real, specific cue and did not turn it into a criticism. It showed her a pattern she had not seen for herself.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { props: [], mouth: 'tight' },
              text: 'You\'re on your phone again. Is this boring you?',
              reaction: {
                default: '"No. Sorry." She pushes it into her pocket. Her face closes a little.'
              },
              override: { trust: -2 },
              debrief: 'Noticed the phone, and read it as rudeness rather than as a signal. The cue was there; the interpretation cost trust.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { shoulders: 'raised' },
              text: 'You\'re calling that lazy. It sounds more like you\'re avoiding something.',
              reaction: {
                default: 'She goes still. "Avoiding what?" She does not wait for an answer.'
              },
              override: { ownership: 4 },
              debrief: 'Offered a different explanation for the same behaviour. It went close to the real issue; how close she let it come depended on trust.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { props: [], gaze: 'door' },
              text: 'Two hours on your phone? Well, that\'s where your grades went, then.',
              reaction: {
                default: '"Wow. OK." She puts the phone away and looks at the door.'
              },
              debrief: 'Turned what she had just shared into evidence against her. She had been open; she will be less so now.'
            }
          ]
        },
        'r1-04b': {
          page: 40,
          act: 2,
          scene: { pose: { gaze: 'phone', arms: 'crossed', shoulders: 'raised', props: ['phone'] } },
          line: 'Dunno. Can\'t be bothered, I guess.',
          cue: 'She has her phone out. Each time you mention exams or next year, she looks down at the screen.',
          next: 'r1-05',
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              pose: { gaze: 'phone' },
              text: 'What\'s it like when you try to think about next year?',
              reaction: {
                default: 'She shrugs, eyes on the screen. "I don\'t really."'
              },
              override: { trust: 1, ownership: 4 },
              debrief: 'An open question aimed at the right place. With trust this low she could only give a small answer, but it was hers.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              pose: { gaze: 'phone' },
              text: 'Are you worried about the exams?',
              reaction: {
                default: '"Not really." She scrolls.'
              },
              debrief: 'Closed: it could be answered with one word, and was.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'It\'s OK if this is hard to talk about. We don\'t have to rush.',
              reaction: {
                default: 'She looks up from the phone. "OK."'
              },
              override: { trust: 5 },
              debrief: 'Took the pressure off when she was shutting down. Trust recovered; the topic was put on hold.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              pose: { gaze: 'phone' },
              text: 'Don\'t worry, the exams are ages away.',
              reaction: {
                default: '"Right." She keeps scrolling.'
              },
              debrief: 'Reassurance that was not quite true. It closed the subject she most needed to open.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { arms: 'lap' },
              text: 'Every time next year comes up, you look at your phone. I\'m not telling you off. I just noticed it.',
              reaction: {
                default: 'She stops scrolling. A pause. "It\'s easier than thinking about it."',
                'extraversion:low': 'She stops scrolling. She does not look up, but she puts the phone away.'
              },
              override: { trust: 4, ownership: 5 },
              debrief: 'Named the pattern and removed the threat in the same breath. When she was saying least, what she was doing said most.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { gaze: 'phone' },
              text: 'You\'re more interested in your phone than in this conversation.',
              reaction: {
                default: '"I\'m listening." She does not look up.'
              },
              override: { trust: -3 },
              debrief: 'Saw the cue and read it as rudeness. It turned a clue into a complaint.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'window' },
              text: 'I don\'t think you can\'t be bothered. I think something about next year is getting to you.',
              reaction: {
                default: 'She looks up, then away. "Maybe."'
              },
              override: { ownership: 3 },
              debrief: 'Offered a different explanation for "can\'t be bothered". It was close to the truth, and pushing at low trust carries a cost.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { chair: 'edge' },
              text: 'If you can\'t be bothered, there\'s not much I can do for you.',
              reaction: {
                default: '"Fine." She half stands up, then sits back down.'
              },
              debrief: 'Called her bluff. It left her with nowhere to go except the door.'
            }
          ]
        },
        'r1-05': {
          page: 45,
          act: 2,
          scene: { pose: { gaze: 'window', head: 'down', mouth: 'flat' } },
          line: 'Anyway. Everyone\'s already decided what I\'m doing after school.',
          cue: 'She says it quietly, to the window. She does not explain, and she does not look at you.',
          next: { question: 'r1-06a', support: 'r1-06b', observe: 'r1-06c', challenge: [{ to: 'r1-06d', if: { trust: { min: 50 } } }, { to: 'r1-06e' }], default: 'r1-06a' },
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              pose: { head: 'down' },
              text: 'What\'s it like, having that already decided?',
              reaction: {
                default: '"It\'s fine. It\'s just... how it is." Her voice is smaller.'
              },
              override: { trust: 1, ownership: 5 },
              debrief: 'Asked about her experience of the decision rather than the decision itself. She did not explain, but she stayed with it.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Who\'s decided? Your parents?',
              reaction: {
                default: '"I didn\'t say that." She closes the subject.'
              },
              debrief: 'Leading: it guessed the answer and named her family before she had. She shut the topic rather than choosing to explain.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              text: 'That sounds like a lot to carry on your own.',
              reaction: {
                default: 'She nods, only just.'
              },
              override: { trust: 3 },
              debrief: 'Acknowledged the weight without prying. It kept her safe; what she meant stayed unsaid.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              pose: { gaze: 'floor' },
              text: 'Don\'t worry about after school yet. That\'s years away.',
              reaction: {
                default: '"It isn\'t, though." She looks at the floor.'
              },
              override: { ownership: -2 },
              debrief: 'Tried to lift the weight by shrinking the future. For someone two years from finishing school, it did not ring true.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              text: 'You said "everyone\'s decided". I noticed you didn\'t say what you\'d decided.',
              reaction: {
                default: 'She is quiet for a long moment. "No. I didn\'t."'
              },
              override: { trust: 1, ownership: 5 },
              debrief: 'Reflected exactly what she had and had not said. It showed her where she was missing from her own sentence.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { mouth: 'tight' },
              text: 'You\'ve gone quiet. That clearly upsets you.',
              reaction: {
                default: '"It doesn\'t upset me." It clearly does.'
              },
              debrief: 'Accurate, and announced as a fact about her feelings. She denied it, as most people would.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'Maybe. But you\'d be the one living it, so I\'d be interested in what you think too.',
              reaction: {
                default: '"What I think doesn\'t really change anything." But she is looking at you now.'
              },
              override: { ownership: 4 },
              debrief: 'Put her own view back on the table without criticising anyone else\'s. A real push; it needed enough trust to be heard as interest, not as taking sides.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'window' },
              text: 'Well, nobody can decide your future for you.',
              reaction: {
                default: '"You don\'t know that." She looks away.'
              },
              override: { trust: -2 },
              debrief: 'A slogan, and one that quietly took sides against whoever had "decided". She dismissed it easily.'
            }
          ]
        },
        'r1-06a': {
          page: 51,
          act: 3,
          scene: { pose: { gaze: 'counsellor', arms: 'lap' } },
          line: 'I don\'t know. I just want it to stop feeling like this.',
          cue: 'She looks at you for the first time in a while.',
          next: 'r1-07',
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'If things were a bit better two weeks from now, what would be different?',
              reaction: {
                default: 'She thinks. "I\'d have started something. Even one thing. Without it being a whole drama."'
              },
              override: { trust: 2, ownership: 5 },
              debrief: 'Asked her to picture a small, near future. She described a change in her own words, which made it hers.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Do you want to feel better about school?',
              reaction: {
                default: '"Obviously."'
              },
              debrief: 'A question with only one possible answer. She gave it.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { shoulders: 'relaxed' },
              text: 'That makes sense. Feeling stuck every evening sounds really draining.',
              reaction: {
                default: '"It is." She breathes out.'
              },
              override: { trust: 3 },
              debrief: 'Stayed with the feeling she had just named. She felt heard; the future stayed unexplored.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              text: 'It will stop. These things always pass.',
              reaction: {
                default: '"Will it?" She does not sound sure.'
              },
              debrief: 'A promise you could not keep. Comforting for a moment, and it asked nothing of her.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              text: 'When you said that, you sat up a little. It sounds like you really want things to change.',
              reaction: {
                default: '"I do. I just don\'t know how."'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Linked what you saw to what she said. It let her hear her own wish for change.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              text: 'You obviously know what you need to do.',
              reaction: {
                default: '"Do I?"'
              },
              debrief: 'Presented as confidence in her, received as pressure. The observation was about you, not her.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              text: 'I think you have more say over how this feels than it seems right now.',
              reaction: {
                default: '"Like what?" Doubtful, but curious.'
              },
              override: { ownership: 3 },
              debrief: 'Challenged her sense of helplessness. A hopeful push; it needed trust to sound like belief rather than blame.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              text: 'Well, it won\'t stop by itself.',
              reaction: {
                default: '"I know that." Flat.'
              },
              debrief: 'True and blunt. It told her what she knew and left her feeling told off.'
            }
          ]
        },
        'r1-06b': {
          page: 54,
          act: 3,
          scene: { pose: { gaze: 'floor', arms: 'lap', shoulders: 'relaxed' } },
          line: 'Yeah. It is a lot. I don\'t really talk about it.',
          cue: 'Her shoulders drop. She does not seem in a hurry to leave.',
          next: 'r1-07',
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'If the next two weeks went a bit better, what would you notice first?',
              reaction: {
                default: '"That I\'d done some homework without it being a whole thing." A small shrug.'
              },
              override: { trust: 2, ownership: 5 },
              debrief: 'Moved from comfort to the future at the moment she felt safest. She did the picturing herself.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Would it help to talk about it more?',
              reaction: {
                default: '"Maybe."'
              },
              debrief: 'A closed question when she had just started talking. It invited a yes or no, and got neither.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              text: 'I\'m glad you\'re talking about it now.',
              reaction: {
                default: '"Me too. I think."'
              },
              override: { trust: 2, ownership: -1 },
              debrief: 'Warm and true. More comfort at this point kept her safe, and it kept the next step with you.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              pose: { shoulders: 'relaxed' },
              text: 'You can always come to me with anything. I\'ll sort it out.',
              reaction: {
                default: '"OK." She looks relieved, and a little let off.'
              },
              debrief: 'A generous offer that moved the problem to your desk. Relief came at the cost of her ownership.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { mouth: 'slightSmile' },
              text: 'You said you don\'t really talk about it. You\'re talking about it now.',
              reaction: {
                default: '"Yeah. Weird." A small smile.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Showed her something she was already doing differently. Small, and it was hers.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { head: 'up' },
              text: 'You look really down about it all.',
              reaction: {
                default: '"I\'m fine." She sits up straighter, as if to prove it.'
              },
              debrief: 'Described her mood for her. She disagreed in order to keep some control.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              text: 'Not talking about it is one way to cope. I\'m not sure it\'s working for you.',
              reaction: {
                default: '"...No. It isn\'t."'
              },
              override: { ownership: 3 },
              debrief: 'Questioned her way of coping, gently. A push that relied on the warmth already there.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              text: 'Then you need to start talking about it, don\'t you?',
              reaction: {
                default: '"I guess."'
              },
              debrief: 'Turned her admission into an instruction. She agreed, without owning it.'
            }
          ]
        },
        'r1-06c': {
          page: 58,
          act: 3,
          scene: { pose: { gaze: 'counsellor', mouth: 'tight' } },
          line: '...I didn\'t say what I want, did I.',
          cue: 'A short laugh that is not really a laugh.',
          next: 'r1-07',
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'What would you want the next two weeks to look like?',
              reaction: {
                default: '"Less of this. Less being annoyed at myself at eleven at night." She pauses. "Actually starting things."'
              },
              override: { trust: 2, ownership: 5 },
              debrief: 'Gave her the question she had just asked herself. She answered it, which made the future hers.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Do you know what you want?',
              reaction: {
                default: '"No." Quickly.'
              },
              debrief: 'Closed, and asked at the moment she was least sure. It invited the easiest answer.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              text: 'That\'s OK. It\'s not easy to know what you want at sixteen.',
              reaction: {
                default: '"Everyone else seems to know."'
              },
              override: { trust: 3 },
              debrief: 'Normalised not knowing, kindly. It eased the pressure, and it eased the question away too.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              text: 'You don\'t need to know yet. Don\'t worry about it.',
              reaction: {
                default: '"OK." She lets it go.'
              },
              debrief: 'Rescued her from an uncomfortable thought she had arrived at herself. Comfortable; the thought was lost.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'You laughed, but it didn\'t sound like you found it funny.',
              reaction: {
                default: '"No. It isn\'t." She looks at you properly.'
              },
              override: { ownership: 3 },
              debrief: 'Noticed the gap between her laugh and her face. It let her drop the act without being told to.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              text: 'You clearly have no idea what you want.',
              reaction: {
                default: '"Thanks."'
              },
              debrief: 'Took her own observation and handed it back as a criticism. It sounded like a verdict.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'I think you might have more of an idea than you\'re letting yourself say.',
              reaction: {
                default: 'She looks at you for a long moment. "Maybe."'
              },
              override: { ownership: 4 },
              debrief: 'Pushed on her not-knowing. With trust in place it can feel like belief in her; without it, like pressure.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              text: 'Well, you need to work that out, then.',
              reaction: {
                default: '"Yeah. Obviously."'
              },
              debrief: 'An instruction where an invitation was possible. She agreed and closed off.'
            }
          ]
        },
        'r1-06d': {
          page: 62,
          act: 3,
          scene: { pose: { gaze: 'window', chair: 'back' } },
          line: 'I suppose. I just don\'t know what I\'d change.',
          cue: 'She sits back and thinks. She has not looked at the door for a while.',
          next: 'r1-07',
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'If it were two weeks from now and things were slightly better, what would you see?',
              reaction: {
                default: '"Me doing chemistry before my phone. Maybe." She seems surprised by her own answer.'
              },
              override: { trust: 2, ownership: 5 },
              debrief: 'Followed a push with an open question. The push opened the door; the question let her walk through it.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Would getting your homework in on time be a good change?',
              reaction: {
                default: '"I guess."'
              },
              debrief: 'A suggestion dressed as a question. She accepted your idea instead of finding hers.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { mouth: 'smile' },
              text: 'Not knowing yet is fine. You\'ve thought about a lot today.',
              reaction: {
                default: '"Yeah. My head hurts a bit." A smile.'
              },
              override: { trust: 2 },
              debrief: 'Recognised the effort she had made. Trust rose; the change she might make stayed undefined.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              pose: { gaze: 'counsellor' },
              text: 'Don\'t worry, I\'ll help you work out what to change.',
              reaction: {
                default: '"OK." She waits for you to tell her.'
              },
              debrief: 'Offered help at the moment she was about to think for herself. She waited for your answer instead.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              text: 'You\'ve stopped looking at the door. You\'re really thinking about this.',
              reaction: {
                default: '"I am, actually."'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Showed her the change in her own behaviour. It affirmed her engagement without telling her what to think.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              text: 'You clearly need to change something.',
              reaction: {
                default: '"I know."'
              },
              debrief: 'An observation that was really a judgement. It gave her nothing new.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { mouth: 'tight' },
              text: 'I think you already have one idea. You just don\'t trust it yet.',
              reaction: {
                default: '"...Maybe the phone thing." She pulls a face.'
              },
              override: { ownership: 5 },
              debrief: 'A second push, made with trust already in place. It worked because it pointed at her idea, not yours.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              text: 'You have to change something, or nothing will change.',
              reaction: {
                default: '"Yeah, I get it."'
              },
              debrief: 'Logical and flat. It added pressure without adding direction.'
            }
          ]
        },
        'r1-06e': {
          page: 64,
          act: 3,
          scene: { pose: { gaze: 'door', arms: 'bag', chair: 'edge', shoulders: 'raised' } },
          line: 'You don\'t get it.',
          cue: 'She pulls her bag back onto her lap.',
          next: 'r1-07',
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              text: 'You\'re right, I might not. What am I missing?',
              reaction: {
                default: 'A pause. "It\'s not about being lazy. It\'s just... a lot."'
              },
              override: { trust: 3, ownership: 4 },
              debrief: 'Accepted her criticism and turned it into curiosity. It recovered some ground and let her put you right.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Is it that you don\'t want to talk about after school?',
              reaction: {
                default: '"I don\'t want to talk about any of it."'
              },
              debrief: 'A guess, offered as a yes-or-no question. She took the chance to close everything.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { arms: 'lap' },
              text: 'That\'s fair. I pushed. I\'d still like to understand, if you\'ll let me.',
              reaction: {
                default: 'She hesitates, then puts the bag down.'
              },
              override: { trust: 5 },
              debrief: 'Repaired the rupture openly. Trust came back; there was less time left to use it.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              text: 'I do get it, honestly. I was sixteen once.',
              reaction: {
                default: '"Not like this."'
              },
              debrief: 'Claimed understanding she had just told you was missing. It made the gap between you wider.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { arms: 'bag', chair: 'edge' },
              text: 'You\'ve picked up your bag. I think I pushed too hard just now.',
              reaction: {
                default: '"A bit." The bag stays on her lap, but she does not stand.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Read the bag accurately and said so without blame. Naming the rupture helped repair it.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              pose: { mouth: 'tight', shoulders: 'raised' },
              text: 'You\'re getting really worked up about this.',
              reaction: {
                default: '"I\'m not worked up." Her voice is louder.'
              },
              debrief: 'Described her reaction as a problem. She had to defend herself instead of being understood.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              text: 'Maybe I don\'t. But I don\'t think you\'ve given up, either.',
              reaction: {
                default: '"How would you know?" But she stays.'
              },
              override: { ownership: 3 },
              debrief: 'Held your ground and expressed belief in her. A second push while she was upset; a risk, and she stayed.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { chair: 'edge' },
              text: 'I think you just don\'t want to hear it.',
              reaction: {
                default: 'She stands up. Then, slowly, she sits down again.'
              },
              debrief: 'Pushed again when she had just pushed back. It escalated rather than explored.'
            }
          ]
        },
        'r1-07': {
          page: 70,
          act: 3,
          scene: { pose: { gaze: 'counsellor' } },
          line: 'So what am I supposed to do, then?',
          cue: 'She glances at the clock. The bell will ring soon.',
          next: null, // last page: the round ends after this choice
          options: [
            {
              id: 'q-s', lever: 'question', quality: 'skilful',
              pose: { gaze: 'window' },
              text: 'What\'s one small thing you\'d want to try before we meet again?',
              reaction: {
                default: 'She thinks for a while. "Maybe... do the chemistry first. Before my phone. Just to see."'
              },
              override: { trust: 1, ownership: 5 },
              debrief: 'Asked her for the next step and waited. Whatever she chose, it was hers to try.'
            },
            {
              id: 'q-c', lever: 'question', quality: 'clumsy',
              text: 'Will you promise to hand in your next piece of homework on time?',
              reaction: {
                default: '"I guess."'
              },
              override: { ownership: -2 },
              debrief: 'Got a yes quickly. It was your plan and her agreement, which is not the same as her commitment.'
            },
            {
              id: 's-s', lever: 'support', quality: 'skilful',
              pose: { shoulders: 'relaxed' },
              text: 'You don\'t have to fix everything this week. We can meet again in two weeks and see how things are.',
              reaction: {
                default: '"OK. Yeah." She seems lighter.'
              },
              override: { trust: 2, ownership: -1 },
              debrief: 'Took the pressure off and kept the relationship going. She left lighter, without a step of her own.'
            },
            {
              id: 's-c', lever: 'support', quality: 'clumsy',
              pose: { chair: 'back', shoulders: 'relaxed' },
              text: 'Don\'t worry, I\'ll talk to your teachers and sort out some extensions for you.',
              reaction: {
                default: '"Really? OK. Thanks." She relaxes. The problem is yours now.'
              },
              override: { ownership: -4 },
              debrief: 'Generous, and it took the problem off her completely. It also promised something that was not yours alone to give.'
            },
            {
              id: 'o-s', lever: 'observe', quality: 'skilful',
              pose: { gaze: 'window' },
              text: 'You\'ve talked about the moment you sit down and then stop. That moment seems to matter.',
              reaction: {
                default: '"Yeah. If I could just get past the first bit..." She trails off, thinking.'
              },
              override: { ownership: 3 },
              debrief: 'Gave her back a thread from her own words and left the conclusion to her. She started to build on it.'
            },
            {
              id: 'o-c', lever: 'observe', quality: 'clumsy',
              text: 'You obviously know what you need to do.',
              reaction: {
                default: '"Not really. That\'s why I\'m here."'
              },
              debrief: 'Assumed an answer she did not have. It left her with the pressure and none of the help.'
            },
            {
              id: 'c-s', lever: 'challenge', quality: 'skilful',
              pose: { head: 'up' },
              text: 'I could give you a plan, but it would be my plan. I\'d rather hear yours, even if it\'s small.',
              reaction: {
                default: 'She looks surprised. Then: "OK. Let me think."'
              },
              override: { ownership: 5 },
              debrief: 'Refused to take the problem off her, kindly. It is a push; with enough trust it hands her the pen.'
            },
            {
              id: 'c-c', lever: 'challenge', quality: 'clumsy',
              pose: { arms: 'bag', chair: 'edge', gaze: 'door' },
              text: 'Saying "I don\'t know" isn\'t going to get your grades back up.',
              reaction: {
                default: '"I didn\'t say I don\'t know." She picks up her bag.'
              },
              debrief: 'A reprimand at the last moment. It ended the session on her failure rather than her next step.'
            }
          ]
        }
      },
      // How the round can end (SPEC.md 7.7). `text` is shown on the ending
      // page; `summary` is the one line on the debrief's ending card.
      endings: {
        breakthrough: { title: 'Breakthrough', summary: 'Maya proposed a next step of her own, and asked to come back.', text: 'Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. At the door she turns round. "Same time in two weeks?"' },
        partial: { title: 'Agreement without ownership', summary: 'Maya agreed to the step you suggested. The plan stayed yours.', text: 'Maya agrees to the step you suggest. "OK. I\'ll try." She means it, mostly. But it is your plan, not hers, and you can both feel it.' },
        polite: { title: 'Polite exit', summary: 'Maya stayed polite from start to finish and left unmoved.', text: '"Thanks for this." Maya picks up her bag and leaves on time. She was polite from start to finish. Nothing much has changed.' },
        early: { title: 'Early exit', summary: 'Trust ran out, and Maya left before the conversation really began.', text: '"Can I go now?" Maya is already standing, bag on her shoulder. The conversation is over before it really began.' }
      }
    },

    // ---------------------------------------------------------------------
    // ROUND 2 — "Two weeks later". Format C: four unlabelled lines, then
    // "Name that lever". The opening page depends on how Round 1 ended;
    // all four openings rejoin at r2-02. Seven decisions per path.
    r2: {
      title: 'Two weeks later',
      format: 'C',
      // Opening page by Round 1 ending (SPEC.md 9.2).
      starts: { breakthrough: 'r2-01a', partial: 'r2-01b', polite: 'r2-01c', early: 'r2-01d' },
      // The "Two weeks later" interlude before Round 2 (SPEC.md 13, screen 9):
      // how the Round 1 ending sets the scene. Narration only; it must not
      // tell the counsellor what Maya did or did not do (the opening page shows that).
      interlude: {
        breakthrough: 'Two weeks have passed. Maya knocks on your door a few minutes early. Last time she left with a step she chose herself, and she looks as if she has something to tell you. A course brochure is lying on your desk.',
        partial: 'Two weeks have passed. Maya arrives on time, as agreed. Last time she said yes to the step you suggested. A course brochure is lying on your desk.',
        polite: 'Two weeks have passed. Mr Okafor has asked you to see Maya again. Last time she was polite from start to finish, and nothing much changed. A course brochure is lying on your desk.',
        early: 'Two weeks have passed. Mr Okafor has sent Maya back to see you. Last time she left before the conversation really began, and she has not forgotten it. A course brochure is lying on your desk.'
      },
      // Debrief 2, "Two sessions side by side": how the Round 1 ending shaped
      // the Round 2 opening, in words (the numbers are in RULES.carry).
      carryNote: {
        breakthrough: 'She left Round 1 with a step of her own, so she came back with most of the trust you had built, more confidence than before, and more readiness to change. Ownership started low again: a new problem needs new ownership.',
        partial: 'She had agreed to your step rather than chosen one, so she came back with some of the trust, the same confidence, and more readiness to change. Ownership started low again, and the step had not happened.',
        polite: 'Nothing had changed, so she came back much as she was on the first day: trust a little lower, confidence and ownership where they started.',
        early: 'The first conversation ended early, so she came back more reluctant than on the first day: trust lower than at the start of Round 1, everything else where it started.'
      },
      // Act titles and the cliffhanger line shown on the act banner at the end of each act.
      acts: {
        1: { title: 'Reconnecting', cliffhanger: 'She picked up the brochure. Then she put it down again, very carefully.' },
        2: { title: 'The real issue', cliffhanger: 'She had never said it out loud before. Not even to herself.' },
        3: { title: 'Her next step', cliffhanger: 'The bell rang. For once, she did not move straight away.' }
      },
      nodes: {
        'r2-01a': {
          // Opening after a Round 1 breakthrough ending.
          page: 81,
          act: 1,
          scene: { pose: { gaze: 'counsellor', arms: 'lap', chair: 'back', props: ['brochure'] } },
          line: 'So I tried it. The thing I said. It worked for about a week. Then it didn\'t.',
          cue: 'She sits back in the chair, bag on the floor. There is a course brochure on your desk, and she glances at it.',
          next: 'r2-02',
          options: [
            {
              id: 'q', lever: 'question',
              text: 'What helped, in the week it worked?',
              reaction: {
                default: '"I just did it before I could think about it." A pause. "Then I got a bad mark in chemistry and sort of stopped."'
              },
              debrief: 'Started with what went well, in her words. It kept the check-in about learning rather than about keeping a promise.'
            },
            {
              id: 's', lever: 'support',
              pose: { mouth: 'slightSmile' },
              text: 'Well done for trying it. I\'m really proud of you.',
              reaction: {
                default: '"Thanks." A small smile that does not quite reach her eyes. "It didn\'t last, though."'
              },
              override: { trust: -3, ownership: -3 },
              debrief: 'Warm praise, and it put you in the role of judge. It felt good for a moment and moved the focus from what she learned to what you thought of it.'
            },
            {
              id: 'o', lever: 'observe',
              pose: { head: 'up' },
              text: 'You look quite pleased about that week, even though it stopped.',
              reaction: {
                default: '"I am, a bit." She sits up. "I didn\'t think I\'d manage any of it."'
              },
              debrief: 'Noticed the pride she had not mentioned. It let her own the success before discussing the setback.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { mouth: 'flat' },
              text: 'You say it didn\'t work. I think you might have given up on it a bit early.',
              reaction: {
                default: '"Maybe." Her smile fades. "I knew you\'d say that."'
              },
              override: { trust: -5, ownership: -5 },
              debrief: 'A fair push, made in the first minute. It risked turning the check-in into a check-up.'
            }
          ]
        },
        'r2-01b': {
          // Opening after a Round 1 partial ending.
          page: 84,
          act: 1,
          scene: { pose: { gaze: 'floor', arms: 'bag', chair: 'edge', props: ['brochure'] } },
          line: 'I forgot. Sorry.',
          cue: 'She says it before she has even sat down, and she does not look at you.',
          next: 'r2-02',
          options: [
            {
              id: 'q', lever: 'question',
              pose: { gaze: 'counsellor', head: 'up' },
              text: 'What got in the way, do you think?',
              reaction: {
                default: '"I don\'t know." She sits. "I think I said yes because you wanted me to." She looks up, checking.'
              },
              debrief: 'Asked about the gap between agreeing and doing, without blame. It let her name the difference herself.'
            },
            {
              id: 's', lever: 'support',
              pose: { shoulders: 'relaxed' },
              text: 'That\'s OK. Two weeks goes quickly. I\'m glad you came back.',
              reaction: {
                default: '"Yeah." Relief, and then nothing more.'
              },
              debrief: 'Took the sting out of forgetting. It eased her guilt and left the reason for forgetting untouched.'
            },
            {
              id: 'o', lever: 'observe',
              text: 'You said sorry before you sat down. It sounds like you were expecting me to be cross.',
              reaction: {
                default: '"Aren\'t you?" A pause. "It was your idea, not mine. So I didn\'t really think about it."'
              },
              debrief: 'Reflected what her apology suggested. It brought out how she had experienced the agreed step: as yours.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { gaze: 'counsellor', shoulders: 'relaxed' },
              text: 'I wonder if it was ever really your plan. It might have been mine.',
              reaction: {
                default: 'She looks up. "It was kind of yours." She seems relieved that someone said it.'
              },
              override: { trust: -2 },
              debrief: 'Questioned the plan rather than her. A bold reframe of "I forgot"; it depended on her trusting you enough to agree.'
            }
          ]
        },
        'r2-01c': {
          // Opening after a Round 1 polite ending.
          page: 87,
          act: 1,
          scene: { pose: { gaze: 'counsellor', arms: 'bag', props: ['brochure'] } },
          line: 'Hi. Nothing\'s really changed, before you ask.',
          cue: 'She sits in the middle of the chair, bag on her knees. Polite, and closed.',
          next: 'r2-02',
          options: [
            {
              id: 'q', lever: 'question',
              text: 'OK. What have the last two weeks been like, then?',
              reaction: {
                default: '"Same. School, home, homework I don\'t do." A small shrug.'
              },
              override: { trust: 1 },
              debrief: 'Accepted her "nothing" and asked about her experience anyway. A low-pressure way back in.'
            },
            {
              id: 's', lever: 'support',
              pose: { mouth: 'slightSmile' },
              text: 'Thanks for coming back. That counts for something.',
              reaction: {
                default: '"Mr Okafor made me." But she smiles slightly.'
              },
              override: { trust: 3, ownership: 1 },
              debrief: 'Valued her being there at all. A warm restart after a session that went nowhere.'
            },
            {
              id: 'o', lever: 'observe',
              text: 'You said that before I could ask. It sounds like you thought I\'d be disappointed.',
              reaction: {
                default: '"Maybe." She shifts in her seat.'
              },
              override: { trust: 1 },
              debrief: 'Read the defence in her opening line. Accurate; at low trust it can feel like being seen through.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { arms: 'crossed' },
              text: 'Nothing at all? I find that hard to believe.',
              reaction: {
                default: '"Well, it\'s true." She folds her arms.'
              },
              debrief: 'Disputed her account in the first exchange. It signalled that you expected more of her, before she felt safe.'
            }
          ]
        },
        'r2-01d': {
          // Opening after a Round 1 early ending.
          page: 89,
          act: 1,
          scene: { pose: { gaze: 'door', arms: 'bag', chair: 'edge', shoulders: 'raised', props: ['brochure'] } },
          line: 'Mr Okafor said I had to come back. No offence, but I don\'t really want to be here.',
          cue: 'She sits on the very edge of the chair by the door, bag still on her shoulder.',
          next: 'r2-02',
          options: [
            {
              id: 'q', lever: 'question',
              text: 'That\'s fair. What would make it worth staying for ten minutes?',
              reaction: {
                default: '"I don\'t know. If you didn\'t go on about my grades, maybe."'
              },
              override: { trust: 2 },
              debrief: 'Let her set the terms for staying. She got some control back, although she was still on the edge of the chair.'
            },
            {
              id: 's', lever: 'support',
              pose: { arms: 'lap', gaze: 'counsellor' },
              text: 'Last time didn\'t go well, and I think I pushed too hard. I\'m sorry. You can set the pace today.',
              reaction: {
                default: 'She looks surprised. "OK." She lets the bag slide off her shoulder.'
              },
              override: { trust: 3, ownership: 5 },
              debrief: 'Owned the last session openly. It rebuilt trust and asked nothing of her yet.'
            },
            {
              id: 'o', lever: 'observe',
              text: 'You\'ve sat right by the door. It looks like you want to be able to leave.',
              reaction: {
                default: '"Kind of." She does not move, but she does not leave either.'
              },
              override: { trust: 2, ownership: 2 },
              debrief: 'Named what her position said, and allowed it. Honest; with so little trust it could easily feel watched.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { mouth: 'tight' },
              text: 'You\'re here, though. Part of you must want something from this.',
              reaction: {
                default: '"I\'m here because I have to be." Her jaw tightens.'
              },
              debrief: 'Pushed back on her reluctance straight away. A hopeful reading of her presence, offered before she could hear it.'
            }
          ]
        },
        'r2-02': {
          page: 93,
          act: 1,
          scene: { pose: { gaze: 'floor', arms: 'lap', props: ['brochure'] } },
          line: 'The thing is, even when I do the work, it doesn\'t feel like it\'s for anything.',
          cue: 'She picks up the course brochure from your desk, turns a page, then puts it down quickly.',
          next: [{ to: 'r2-03a', if: { trust: { min: 45 } } }, { to: 'r2-03b', if: { trust: { min: 30 } } }, { to: 'r2-03c' }],
          options: [
            {
              id: 'q', lever: 'question',
              text: 'What would it need to be for, to feel worth it?',
              reaction: {
                default: '"I don\'t know. Something I actually..." She stops. "Never mind."',
                'readiness:mid': '"Something I actually chose, I suppose." She looks at the brochure.'
              },
              debrief: 'Asked about purpose, which is where this was heading. She came close to saying it, in her own time.'
            },
            {
              id: 's', lever: 'support',
              text: 'That sounds really flat. Working hard for something that doesn\'t feel like yours.',
              reaction: {
                default: '"Yeah. It is." She looks at the brochure again.'
              },
              override: { trust: 2 },
              debrief: 'Put words to the feeling and stayed with her. She felt understood; the brochure went unremarked.'
            },
            {
              id: 'o', lever: 'observe',
              text: 'You picked up that brochure and put it down very fast.',
              reaction: {
                default: '"It\'s nothing. Just... my mum has one like it at home."'
              },
              debrief: 'Used the cue in front of you. It led straight to the real subject without your having to name it.'
            },
            {
              id: 'c', lever: 'challenge',
              text: 'I\'m not sure it\'s for nothing. You\'re still doing some of it, so something must matter to you.',
              reaction: {
                default: '"Maybe." She does not sound convinced.'
              },
              override: { trust: -3, ownership: -3 },
              debrief: 'Offered a more hopeful reading of her effort. A reasonable push; it argued with her feeling rather than exploring it.'
            }
          ]
        },
        'r2-03a': {
          page: 98,
          act: 2,
          scene: { pose: { gaze: 'counsellor', arms: 'open', props: ['brochure'] } },
          line: 'My mum brought one of these home. Medicine. It\'s kind of... already the plan.',
          cue: 'She taps the cover of the brochure. She does not sound unhappy. She does not sound happy, either.',
          next: [{ to: 'r2-04a', if: { trust: { min: 45 } } }, { to: 'r2-04b' }],
          options: [
            {
              id: 'q', lever: 'question',
              text: 'What do you make of the plan?',
              reaction: {
                default: '"It\'s a good plan. Being a doctor is a good job." A pause. "It\'s just not me, I don\'t think."'
              },
              debrief: 'An open question about her view, with no view of your own in it. It made room for her to disagree with the plan without disagreeing with her family.'
            },
            {
              id: 's', lever: 'support',
              pose: { head: 'down' },
              text: 'It sounds like your family really cares about how things turn out for you.',
              reaction: {
                default: '"They do. They really do." She sounds almost guilty.'
              },
              override: { trust: -3, ownership: -3 },
              debrief: 'Respected her family\'s intentions, which is fair to them. Said just as she was opening up, it made anything she wanted sound ungrateful, and her own wishes stayed unspoken.'
            },
            {
              id: 'o', lever: 'observe',
              text: 'You said "already the plan". Not "my plan".',
              reaction: {
                default: 'She is quiet. "Yeah. I noticed that too."'
              },
              debrief: 'Reflected her exact words. It showed her where she was in her own sentence, without anyone being blamed.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { mouth: 'flat' },
              text: 'Is it the plan, though? You\'re the one who\'d be studying it.',
              reaction: {
                default: '"It\'s not that simple." She puts the brochure down.'
              },
              override: { trust: -1, ownership: -3 },
              debrief: 'Questioned the plan at its first mention. It went straight at the real issue, before she had chosen to open it.'
            }
          ]
        },
        'r2-03b': {
          page: 102,
          act: 2,
          scene: { pose: { gaze: 'floor', arms: 'lap', props: ['brochure'] } },
          line: 'My parents want me to do medicine. So.',
          cue: 'She shrugs, eyes on the brochure.',
          next: [{ to: 'r2-04a', if: { trust: { min: 45 } } }, { to: 'r2-04b' }],
          options: [
            {
              id: 'q', lever: 'question',
              text: 'What\'s that like for you?',
              reaction: {
                default: '"Fine. I mean, it\'s a good thing to do." She does not sound convinced by her own voice.'
              },
              override: { trust: 3, ownership: 5 },
              debrief: 'Asked about her experience of the expectation, not the expectation itself. She answered politely, and her tone said more.'
            },
            {
              id: 's', lever: 'support',
              pose: { head: 'up' },
              text: 'That\'s a big expectation to grow up with. It makes sense that it weighs on you.',
              reaction: {
                default: '"Yeah." She looks up. "I don\'t want to let them down."'
              },
              override: { trust: 3, ownership: 1 },
              debrief: 'Acknowledged the weight without criticising anyone. It made it safe to say what she feared.'
            },
            {
              id: 'o', lever: 'observe',
              pose: { head: 'down' },
              text: 'You said "my parents want". You didn\'t say what you want.',
              reaction: {
                default: '"Because it doesn\'t matter." Quietly.'
              },
              override: { trust: -3 },
              debrief: 'Pointed at the gap in her sentence. Accurate; at this level of trust it brought out her hopelessness rather than her wishes.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { arms: 'crossed' },
              text: 'I\'m not hearing much of you in that plan.',
              reaction: {
                default: '"Well, it\'s not really up to me." Her arms fold.'
              },
              override: { trust: -5 },
              debrief: 'Pushed for her own view early. It was close to the truth and arrived before she trusted you with it.'
            }
          ]
        },
        'r2-03c': {
          page: 105,
          act: 2,
          scene: { pose: { gaze: 'door', arms: 'crossed', shoulders: 'raised', props: ['brochure'] } },
          line: 'Doesn\'t matter. My family\'s got it all worked out.',
          cue: 'Her arms are crossed. She is looking at the door again.',
          next: [{ to: 'r2-04a', if: { trust: { min: 45 } } }, { to: 'r2-04b' }],
          options: [
            {
              id: 'q', lever: 'question',
              text: 'What have they worked out?',
              reaction: {
                default: '"Medicine. Obviously." A flat voice.'
              },
              override: { trust: 2, ownership: 3 },
              debrief: 'A simple, open question. It got the fact; at this level of trust, not the feeling.'
            },
            {
              id: 's', lever: 'support',
              pose: { arms: 'lap' },
              text: 'You don\'t have to talk about home if you don\'t want to. I\'m listening either way.',
              reaction: {
                default: 'Her arms loosen a little. "It\'s fine. It\'s just medicine. They want me to be a doctor." She says it as if deciding to.'
              },
              override: { trust: 3, ownership: 5 },
              debrief: 'Gave her permission not to talk, which made talking her own choice. Trust came first; the detail followed, on her terms.'
            },
            {
              id: 'o', lever: 'observe',
              pose: { gaze: 'counsellor' },
              text: 'You looked at the door as soon as your family came up.',
              reaction: {
                default: '"I didn\'t." She looks back at you, a bit too quickly.'
              },
              override: { trust: 2, ownership: 3 },
              debrief: 'Named a real cue. With trust this low, being seen felt more like being caught.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { gaze: 'door' },
              text: 'I\'m not sure it\'s as worked out as you\'re making it sound.',
              reaction: {
                default: '"You don\'t know my family." She turns towards the door.'
              },
              debrief: 'Doubted her account at her most guarded. A push that she heard as a judgement of her family.'
            }
          ]
        },
        'r2-04a': {
          page: 111,
          act: 2,
          scene: { pose: { gaze: 'window', arms: 'gesturing', mouth: 'slightSmile', props: ['brochure'] } },
          line: 'I like design. Like, making things look right. Posters, rooms, whatever. But there\'s no point even thinking about it.',
          cue: 'She smiles when she says "design". Then the smile goes.',
          next: 'r2-05',
          options: [
            {
              id: 'q', lever: 'question',
              pose: { arms: 'gesturing', mouth: 'smile' },
              text: 'What is it about design that you like?',
              reaction: {
                default: 'She talks for longer than she has all term: colours, layouts, the poster she made for the school play. Then she stops. "Anyway."',
                'readiness:mid': 'She talks for longer than she has all term: colours, layouts, the poster she made for the school play. "I\'d actually love to do that properly."'
              },
              debrief: 'Invited her to talk about what she cares about. She came alive, and the "no point" lost some of its grip.'
            },
            {
              id: 's', lever: 'support',
              text: 'It\'s clear that matters to you. It\'s OK to care about something.',
              reaction: {
                default: '"I know. It\'s just complicated."'
              },
              override: { trust: -3, ownership: -3 },
              debrief: 'Gave her permission she had not asked for. Kind, though it sounded like reassurance for a younger student, and the "no point" went unexamined.'
            },
            {
              id: 'o', lever: 'observe',
              pose: { mouth: 'slightSmile' },
              text: 'You smiled when you said "design". Then you stopped.',
              reaction: {
                default: '"Did I?" She smiles again, then catches herself. "It\'s silly."'
              },
              debrief: 'Noticed the smile and its disappearance. It showed her, without argument, that the interest was real.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { chair: 'back' },
              text: 'Is there no point, or is there no permission?',
              reaction: {
                default: '"Wow." She sits back. "It\'s not... it\'s not like that."'
              },
              override: { trust: -3, ownership: -3 },
              debrief: 'A sharp, accurate reframe. It named the conflict before she had, and she defended her family instead of exploring it.'
            }
          ]
        },
        'r2-04b': {
          page: 114,
          act: 2,
          scene: { pose: { gaze: 'floor', arms: 'lap', props: ['brochure'] } },
          line: 'I used to draw a lot. Design stuff. There\'s no point even thinking about it now.',
          cue: 'She is turning the brochure over and over in her hands.',
          next: 'r2-05',
          options: [
            {
              id: 'q', lever: 'question',
              pose: { arms: 'lap' },
              text: 'What did you use to draw?',
              reaction: {
                default: '"Rooms, mostly. How I\'d change them. Posters." Her hands stop moving.'
              },
              override: { trust: 2 },
              debrief: 'A concrete, easy question about something she loved. It brought back the interest before the "no point".'
            },
            {
              id: 's', lever: 'support',
              text: 'It sounds like you miss it.',
              reaction: {
                default: '"I do." She sounds surprised to hear herself say it.'
              },
              override: { trust: 3, ownership: 5 },
              debrief: 'Named the loss underneath "no point". She agreed, and felt it.'
            },
            {
              id: 'o', lever: 'observe',
              pose: { arms: 'lap' },
              text: 'You\'re turning the brochure over and over while you talk about it.',
              reaction: {
                default: 'She stops. Puts it down. "Habit."'
              },
              override: { trust: -3, ownership: 2 },
              debrief: 'Pointed at the restless hands. True; she was not ready to make anything of it.'
            },
            {
              id: 'c', lever: 'challenge',
              text: 'If you used to do it, I don\'t see why there\'s no point now.',
              reaction: {
                default: '"Because there isn\'t." Final.'
              },
              debrief: 'Argued with her conclusion directly. Logical; with trust still low it closed rather than opened.'
            }
          ]
        },
        'r2-05': {
          page: 119,
          act: 2,
          scene: { pose: { gaze: 'floor', head: 'down', props: ['brochure'] } },
          line: 'They\'d never listen anyway. They\'ve wanted this since I was little. They work so hard for me.',
          cue: 'She looks at the floor. Her voice goes quiet on "so hard".',
          next: { question: 'r2-06a', observe: 'r2-06a', support: 'r2-06b', challenge: [{ to: 'r2-06c', if: { trust: { min: 50 } } }, { to: 'r2-06d' }], default: 'r2-06a' },
          options: [
            {
              id: 'q', lever: 'question',
              pose: { shoulders: 'relaxed' },
              text: 'What would you want them to hear, if they did listen?',
              reaction: {
                default: '"That I\'m not ungrateful. That I just... might want something else." A long breath.'
              },
              override: { trust: 1 },
              debrief: 'Asked about her message rather than their reaction. It brought out what she wanted without setting her against them.'
            },
            {
              id: 's', lever: 'support',
              text: 'It\'s clear how much you love them. Wanting them to be proud of you makes sense.',
              reaction: {
                default: '"I do want that." She nods slowly, and the subject closes.'
              },
              debrief: 'Honoured her loyalty to her family. It calmed her, and it closed the subject just as it opened.'
            },
            {
              id: 'o', lever: 'observe',
              pose: { mouth: 'slightSmile' },
              text: 'You said they\'d never listen, and then straight away that they work so hard for you. Both seem true for you.',
              reaction: {
                default: '"Yeah. That\'s the problem." She almost laughs.'
              },
              override: { ownership: -2 },
              debrief: 'Reflected both halves of what she said. It let her hold the conflict without having to choose a side.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { shoulders: 'raised' },
              text: 'You\'re sure they\'d never listen. Have you ever actually told them?',
              reaction: {
                default: 'She goes very still. For a moment she says nothing at all.'
              },
              override: { trust: 3 },
              debrief: 'Questioned her assumption about her parents. The highest-risk line in the session: with enough trust it opens everything; without it, it shuts the door.'
            }
          ]
        },
        'r2-06a': {
          page: 124,
          act: 3,
          scene: { pose: { gaze: 'counsellor', chair: 'leaningIn', props: ['brochure'] } },
          line: 'I don\'t know. Maybe I\'d need to find out more first. I don\'t even know what design courses are like.',
          cue: 'She leans forward a little, elbows on her knees.',
          next: 'r2-07',
          options: [
            {
              id: 'q', lever: 'question',
              pose: { arms: 'gesturing' },
              text: 'What would you want to find out?',
              reaction: {
                default: '"What you actually do. Where you can study it. If it\'s a real job." She counts on her fingers.'
              },
              debrief: 'Let her build her own list. Each item was hers, which made the next step easier to own.'
            },
            {
              id: 's', lever: 'support',
              text: 'That sounds like a sensible place to start.',
              reaction: {
                default: '"Yeah." She nods, and waits for you to say what comes next.'
              },
              debrief: 'Approved her idea. Encouraging; it also put you in charge of what happens next.'
            },
            {
              id: 'o', lever: 'observe',
              pose: { chair: 'leaningIn' },
              text: 'You leaned forward when you said that.',
              reaction: {
                default: '"Did I?" She does not lean back.'
              },
              override: { trust: 2, ownership: -2 },
              debrief: 'Showed her that her body was ahead of her words. A small, real piece of evidence that she cares.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { gaze: 'window' },
              text: 'Finding out is a good start. I wonder if it might also be a way of putting off the conversation at home.',
              reaction: {
                default: '"...Maybe both." She thinks about it.'
              },
              override: { trust: 1, ownership: -1 },
              debrief: 'Questioned whether research was a step or a delay. A useful push; it risked deflating an idea she had only just had.'
            }
          ]
        },
        'r2-06b': {
          page: 127,
          act: 3,
          scene: { pose: { gaze: 'floor', arms: 'lap', shoulders: 'relaxed', props: ['brochure'] } },
          line: 'Thanks. It\'s just a lot.',
          cue: 'She is calmer, but still turning the brochure in her hands.',
          next: 'r2-07',
          options: [
            {
              id: 'q', lever: 'question',
              text: 'If you could change one small thing about it, what would it be?',
              reaction: {
                default: '"I\'d want them to know I like design. Even if nothing else changes."'
              },
              override: { trust: 2 },
              debrief: 'Moved from comfort to a small change, once she felt safe. She named something she wanted.'
            },
            {
              id: 's', lever: 'support',
              pose: { chair: 'back' },
              text: 'It is a lot. Go easy on yourself.',
              reaction: {
                default: '"Yeah." She puts the brochure down. The conversation drifts.'
              },
              override: { ownership: -2 },
              debrief: 'More comfort when she was already comforted. Kind, and the momentum went.'
            },
            {
              id: 'o', lever: 'observe',
              text: 'You\'re still holding the brochure. Part of you hasn\'t put this down.',
              reaction: {
                default: '"I suppose not." She looks at it.'
              },
              override: { ownership: -3 },
              debrief: 'Linked what she held to what she felt. It kept the subject alive without pushing.'
            },
            {
              id: 'c', lever: 'challenge',
              text: 'It is a lot. I don\'t think it gets any lighter by not looking at it, though.',
              reaction: {
                default: '"No. It doesn\'t." A breath.'
              },
              override: { trust: 1, ownership: -2 },
              debrief: 'A gentle push after comfort. It asked her to keep going, and she could.'
            }
          ]
        },
        'r2-06c': {
          page: 131,
          act: 3,
          scene: { pose: { gaze: 'counsellor', head: 'up', shoulders: 'relaxed', props: ['brochure'] } },
          line: '...I\'ve never actually asked them. I\'ve just sort of assumed.',
          cue: 'She looks up. Something has shifted.',
          next: 'r2-07',
          options: [
            {
              id: 'q', lever: 'question',
              text: 'What do you think might happen if you did?',
              reaction: {
                default: '"Mum would be surprised. Dad would ask loads of questions." A pause. "They\'d probably listen. In the end."'
              },
              debrief: 'Invited her to test her own assumption in imagination. She revised it herself, which is more convincing than being told.'
            },
            {
              id: 's', lever: 'support',
              pose: { mouth: 'slightSmile' },
              text: 'That took courage to say.',
              reaction: {
                default: '"It doesn\'t feel brave." But she smiles.'
              },
              override: { ownership: -2 },
              debrief: 'Recognised the moment. It made her feel good about the insight and paused the thinking.'
            },
            {
              id: 'o', lever: 'observe',
              text: 'You sound almost surprised at what you just said.',
              reaction: {
                default: '"I am. I always thought I knew what they\'d say."'
              },
              debrief: 'Reflected the surprise in her voice. It helped her notice that something had changed in her.'
            },
            {
              id: 'c', lever: 'challenge',
              text: 'Assuming has kept things calm at home. I\'m not sure it\'s kept you happy.',
              reaction: {
                default: '"No." Quietly. "It hasn\'t."'
              },
              debrief: 'A second push straight after a breakthrough. True and well-timed for some; for others, a lot to take at once.'
            }
          ]
        },
        'r2-06d': {
          page: 133,
          act: 3,
          scene: { pose: { gaze: 'door', arms: 'crossed', mouth: 'tight', props: ['brochure'] } },
          line: 'You don\'t know my parents.',
          cue: 'She pushes the brochure back across the desk.',
          next: 'r2-07',
          options: [
            {
              id: 'q', lever: 'question',
              pose: { shoulders: 'relaxed' },
              text: 'You\'re right, I don\'t. What are they like?',
              reaction: {
                default: '"They\'re... nice. Strict. They worry a lot." She softens slightly.'
              },
              override: { ownership: 1 },
              debrief: 'Accepted her point and asked to learn. It let her describe her family fairly, which lowered her guard.'
            },
            {
              id: 's', lever: 'support',
              text: 'You\'re right. I don\'t, and I shouldn\'t have assumed. I\'m sorry.',
              reaction: {
                default: 'She pauses. "They\'re not bad people. They just want me to be OK."'
              },
              debrief: 'Repaired the rupture without defending yourself. Trust returned, and she defended her parents, which is fair to them.'
            },
            {
              id: 'o', lever: 'observe',
              text: 'You pushed the brochure away when I said that.',
              reaction: {
                default: '"Because you don\'t get it." But she leaves her hand near it.'
              },
              debrief: 'Named what she did with the brochure. Accurate; it kept the focus on her reaction rather than on repair.'
            },
            {
              id: 'c', lever: 'challenge',
              text: 'I don\'t know them. But I\'m not sure you know what they\'d say, either.',
              reaction: {
                default: '"Can we not." She looks at the clock.'
              },
              debrief: 'Repeated the push after it had already landed badly. The point was fair; the timing was costly.'
            }
          ]
        },
        'r2-07': {
          page: 138,
          act: 3,
          scene: { pose: { gaze: 'counsellor', props: ['brochure'] } },
          line: 'So what do I do? I can\'t just walk in and say "I don\'t want to be a doctor".',
          cue: 'She is looking straight at you.',
          next: null, // last page: the round ends after this choice
          options: [
            {
              id: 'q', lever: 'question',
              text: 'If you did want to raise it at home, how would you want that conversation to go?',
              reaction: {
                default: '"Calmly. Not at dinner." She thinks. "Maybe if I had some stuff to show them first. Or if you were there."',
                'readiness:low': '"I don\'t know. Calmly, I suppose." She thinks. "Not yet, anyway."'
              },
              debrief: 'Asked her to design the next step. Whatever she chose, the plan was hers.'
            },
            {
              id: 's', lever: 'support',
              pose: { gaze: 'counsellor' },
              text: 'Whatever you decide, I\'m here to help you think it through.',
              reaction: {
                default: '"Thanks." She nods, and waits.'
              },
              override: { ownership: -1 },
              debrief: 'A steady offer of help. It kept the door open and left the step undefined.'
            },
            {
              id: 'o', lever: 'observe',
              pose: { mouth: 'slightSmile' },
              text: 'You said "I can\'t just walk in". It sounds like you\'ve already started picturing it.',
              reaction: {
                default: '"...I have, kind of." A nervous laugh.'
              },
              override: { trust: 2, ownership: -2 },
              debrief: 'Caught the plan hidden inside her objection. It let her see she was further on than she thought.'
            },
            {
              id: 'c', lever: 'challenge',
              pose: { shoulders: 'relaxed' },
              text: 'You don\'t have to make a speech. But I don\'t think saying nothing is working for you either.',
              reaction: {
                default: '"No. It isn\'t." She takes a breath. "OK."'
              },
              override: { trust: 3 },
              debrief: 'A clear push at the end. With trust it gives her the nudge to act; without it, it can sound like an ultimatum.'
            }
          ]
        }
      },
      // How the round can end (SPEC.md 7.7). `text` is shown on the ending
      // page; `summary` is the one line on the debrief's ending card.
      endings: {
        breakthrough: { title: 'Breakthrough', summary: 'Maya chose her own next step, and how she wants to raise it at home.', text: 'Maya proposes her own next step. This week she will look up two design courses, properly, and write down what she finds. Then she wants to talk to her mum, at the weekend and not over dinner. "Could you be there? Not to talk for me. Just... there."' },
        partial: { title: 'Agreement without ownership', summary: 'Maya agreed to look at the course you suggested. The step stayed yours.', text: 'Maya agrees to the step you suggest. "OK. I\'ll look at the website." She takes the brochure with her. You are not sure she will open it.' },
        polite: { title: 'Polite exit', summary: 'A pleasant conversation. The brochure stayed on the desk.', text: '"Thanks. I\'ll think about it." She leaves the brochure on the desk. It was a pleasant conversation. Nothing moved.' },
        early: { title: 'Early exit', summary: 'Trust ran out, and Maya left before the real issue came up.', text: '"Can I go now?" She is out of the door before you can answer.' }
      }
    }
  },

  // Debrief 2: three reflection prompts for self-study or the facilitator.
  // Text only: nothing the counsellor thinks or writes is stored.
  reflection: [
    'At which moment did Maya\'s trust matter most to what happened next, and what had built or spent it before then?',
    'Think of a real student who agreed to a plan without owning it. What might a move that builds ownership have sounded like?',
    'Which lever do you reach for first when a conversation gets difficult, and what does it give or cost the student when you do?'
  ],

  // The two biggest turning points per round, highlighted in the debrief.
  // Both are shared pages, so every path passes through them.
  turningPoints: { r1: ['r1-05', 'r1-07'], r2: ['r2-05', 'r2-07'] },

  // What each lever tended to do at a turning point (authored, not simulated).
  // The debrief shows the levers the counsellor did not choose.
  roadNotTaken: {
    'r1-05': {
      question: 'An open question about what it was like to have the future decided tended to keep her talking, although she did not yet say who "everyone" was.',
      support: 'Acknowledging the weight tended to keep trust high and the subject closed: she felt safe, and said no more.',
      observe: 'Pointing out that she had not said what she had decided tended to be the moment she noticed her own absence from the plan.',
      challenge: 'Putting her own view back on the table tended to open her up when trust was already high, and to close her down when it was not.'
    },
    'r1-07': {
      question: 'Asking for one small thing she wanted to try tended to produce a step of her own, if trust and ownership had been built earlier.',
      support: 'Reassurance at this point tended to end the session warmly, with the next step left vague or left with you.',
      observe: 'Handing back a thread from her own words tended to let her build the step herself.',
      challenge: 'Declining to hand her a plan tended to work when she trusted you, and to feel like being left alone with the problem when she did not.'
    },
    'r2-05': {
      question: 'Asking what she would want her parents to hear tended to bring out what she wanted, without setting her against them.',
      support: 'Recognising her love for her family tended to calm her, and to close the subject.',
      observe: 'Naming both halves of what she had said tended to help her hold the conflict rather than pick a side.',
      challenge: 'Questioning her belief that they would never listen was the highest-risk move in the session: with enough trust it tended to open everything up; without it, it tended to shut the door.'
    },
    'r2-07': {
      question: 'Asking how she would want the conversation at home to go tended to let her design her own next step.',
      support: 'Offering to help however she chose tended to leave the step undefined.',
      observe: 'Noticing she had already started picturing the conversation tended to give her the confidence to describe it.',
      challenge: 'Pointing out that saying nothing was not working tended to move her, if she trusted you enough to hear it as care rather than pressure.'
    }
  }
};
