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
//             Bridging lines (SPEC.md 9.5): `line` or `cue` can instead be
//               { default: '...', from: { 'r1-01:s-s': '...' } }
//             The `from` text is shown when the page is reached straight from
//             that page and option ('previous page id:option id'), so the opening
//             follows on from what Maya has just said. The default is shown for
//             every other way in, and after a reload. Presentation only: no
//             score or route changes. Each `from` entry has a comment saying
//             which choice it follows. An ending's `text` works the same way.
//   next      where the page leads after a choice: a node id, null (the round
//             ends), an object keyed by lever (with a `default`), or a list of
//             { to, if: { trust: { min } } } checked on the meters AFTER the choice
//   options   twelve in Round 1 (four levers x skilful/plausible/clumsy), four in Round 2
//
// How an option works:
//   id        unique within its node ('q-s' = question/skilful, 'q-p' plausible ... 'c-c'; Round 2: 'q', 's', 'o', 'c')
//   page      the page number of the reply page this option turns to (shown on the
//             option as "→ p. 143" and at the top of Maya's reaction). Decorative,
//             but unique across the whole case, like the pages of the nodes
//   lever     'question' | 'support' | 'observe' | 'challenge'
//   quality   Round 1 only: 'skilful', 'plausible' or 'clumsy' (SPEC.md 7.2, 9.4)
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
      { text: 'When I asked, she said', trait: 'defensiveness', note: 'Defensiveness: mid. She answered a teacher\'s question with a ready-made explanation that closes the subject: protective, but not hostile.' },
      { text: 'has missed two homework deadlines', trait: 'readiness', note: 'Readiness for change: low. The pattern is established and she has not yet tried to change it, so Ownership builds slowly in the first act.' }
    ]
  },

  rounds: {

    // ---------------------------------------------------------------------
    // ROUND 1 — "Just lazy". Format B: pick a lever, then one of three wordings (skilful, plausible, clumsy).
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
              id: 'q-s', page: 46, lever: 'question', quality: 'skilful',
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
              id: 'q-p', page: 273, lever: 'question', quality: 'plausible',
              pose: { arms: 'bag' },
              text: 'Thanks for coming. What do you think has made the grades slip this term?',
              reaction: {
                default: '"I don\'t know. I just stopped keeping up." She keeps hold of the strap.'
              },
              debrief: 'A reasonable question about causes, asked before she had settled. She answered it, inside the frame of the grades she came in braced for.'
            },
            {
              id: 'q-c', page: 112, lever: 'question', quality: 'clumsy',
              pose: { gaze: 'floor' },
              text: 'Thanks for coming. Is it mainly the homework, or are lessons harder too?',
              reaction: {
                default: '"Both, I guess." She looks at the floor.'
              },
              debrief: 'An either-or question that set the options for her. It was easy to answer, and it narrowed the talk to schoolwork before she had said what was going on.'
            },
            {
              id: 's-s', page: 166, lever: 'support', quality: 'skilful',
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
              id: 's-p', page: 321, lever: 'support', quality: 'plausible',
              pose: { arms: 'bag' },
              text: 'Thanks for coming in. Lots of students have a term like this, and it usually settles down.',
              reaction: {
                default: '"Maybe." She nods, but her hand stays on the strap.'
              },
              debrief: 'Normalising, and kindly meant. It reassured her before she had said anything, so it reassured a version of the problem you had guessed.'
            },
            {
              id: 's-c', page: 169, lever: 'support', quality: 'clumsy',
              pose: { mouth: 'slightSmile' },
              text: 'Thanks for coming in. I don\'t think you\'re lazy at all, from what Mr Okafor has told me.',
              reaction: {
                default: '"He doesn\'t know either." A half-smile, as if you have missed the point.'
              },
              debrief: 'Warm, and it contradicted her account before you had heard it. It also told her she had been discussed, which made the reassurance harder to trust.'
            },
            {
              id: 'o-s', page: 41, lever: 'observe', quality: 'skilful',
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
              id: 'o-p', page: 259, lever: 'observe', quality: 'plausible',
              pose: { chair: 'back' },
              text: 'You\'re sitting near the door with your bag still in your hand. It looks as if you\'re not sure how long this will take.',
              reaction: {
                default: '"I\'ve got class after." She sits back a little anyway.'
              },
              debrief: 'Accurate: you described what you could see. At this level of trust a comment on her body can feel like being watched, and she explained it away.'
            },
            {
              id: 'o-c', page: 79, lever: 'observe', quality: 'clumsy',
              pose: { arms: 'bag' },
              text: 'You said "lazy" very quickly, before I\'d asked anything. It sounds like you\'ve already decided that\'s the answer.',
              reaction: {
                default: '"Well, it is the answer." She grips the strap.'
              },
              debrief: 'Started from what she said and ended on a judgement about her. "Already decided" sounded like criticism, and she held her position.'
            },
            {
              id: 'c-s', page: 191, lever: 'challenge', quality: 'skilful',
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
              id: 'c-p', page: 257, lever: 'challenge', quality: 'plausible',
              text: '"Lazy" is one explanation. Usually there\'s something else behind it.',
              reaction: {
                default: '"Like what?" She sounds tired rather than curious.'
              },
              debrief: 'A fair point, made as a general rule. It suggested you knew her story before she had told it.'
            },
            {
              id: 'c-c', page: 180, lever: 'challenge', quality: 'clumsy',
              pose: { arms: 'crossed', mouth: 'tight' },
              text: '"Lazy" is one explanation. It doesn\'t sound like the real one to me.',
              reaction: {
                default: 'She folds her arms. "Well, it is." The room goes quiet.'
              },
              override: { trust: -2 },
              debrief: 'Set your view against hers before there was trust to hold it. Her explanation became something to defend.'
            }
          ]
        },
        'r1-02': {
          page: 12,
          act: 1,
          scene: { pose: { gaze: 'counsellor', arms: 'bag', chair: 'edge' } },
          line: {
            default: 'So what is this, then? Like, a warning?',
            from: {
              // after p. 7, Challenge (plausible): ""Lazy" is one explanation. Usually there's somethi..."
              'r1-01:c-p': 'See, you don\'t know either. So what is this, then? A warning?',
              // after p. 7, Challenge (skilful): ""Lazy" is one explanation. I'm not sure it's the w..."
              'r1-01:c-s': 'You don\'t know either, then. So what is this? Like, a warning?',
              // after p. 7, Support (skilful): "Thanks for coming in. You're not in trouble. I'd j..."
              'r1-01:s-s': 'So if it\'s not about trouble... what is it, then? What happens now?'
            }
          },
          cue: {
            default: 'The bag is off her shoulder now, but it is on her lap, both hands on it.',
            from: {
              // after p. 7, Challenge (clumsy): ""Lazy" is one explanation. It doesn't sound like t..."
              'r1-01:c-c': 'She has unfolded her arms, but only to grip the bag on her lap with both hands.',
              // after p. 7, Challenge (skilful): ""Lazy" is one explanation. I'm not sure it's the w..."
              'r1-01:c-s': 'Her arms unfold, and both hands go back to the bag on her lap.'
            }
          },
          next: { question: 'r1-03a', support: 'r1-03b', observe: 'r1-03c', challenge: 'r1-03d', default: 'r1-03a' },
          options: [
            {
              id: 'q-s', page: 145, lever: 'question', quality: 'skilful',
              text: 'What would you want to get out of talking today, if anything?',
              reaction: {
                default: '"I don\'t know. Not being nagged, I guess." She thinks. "Maybe working out why I can\'t just... do stuff."'
              },
              override: { trust: 1, ownership: 5 },
              debrief: 'Asked her to set the purpose of the conversation. It handed her some ownership early, though she had to think on the spot.'
            },
            {
              id: 'q-p', page: 267, lever: 'question', quality: 'plausible',
              text: 'What do you think Mr Okafor is hoping we\'ll get out of today?',
              reaction: {
                default: '"For me to stop being lazy, probably." She shrugs.'
              },
              debrief: 'Invited her view, but of someone else\'s purpose. She answered for Mr Okafor, and the conversation stayed his.'
            },
            {
              id: 'q-c', page: 184, lever: 'question', quality: 'clumsy',
              text: 'Shall we use today to make a plan for getting the grades back up?',
              reaction: {
                default: '"I guess." She says it as if she has said it many times before.'
              },
              debrief: 'A closed question with your agenda inside it. She agreed; the purpose was yours, not hers.'
            },
            {
              id: 's-s', page: 178, lever: 'support', quality: 'skilful',
              pose: { arms: 'lap' },
              text: 'It\'s not a warning. It\'s just a chance to talk about how things are going, at whatever pace suits you.',
              reaction: {
                default: '"OK." She puts the bag down on the floor.'
              },
              override: { trust: 5 },
              debrief: 'Removed the threat and let her set the pace. Trust rose; the purpose of the conversation stayed vague.'
            },
            {
              id: 's-p', page: 319, lever: 'support', quality: 'plausible',
              pose: { arms: 'bag' },
              text: 'It\'s not a warning. Lots of students come in here, and it usually turns out to be nothing serious.',
              reaction: {
                default: '"OK." Her hands stay on the bag.'
              },
              debrief: 'Lowered the stakes by making it ordinary. It reassured her, and it also told her the answer before she had said anything.'
            },
            {
              id: 's-c', page: 163, lever: 'support', quality: 'clumsy',
              pose: { mouth: 'flat' },
              text: 'It\'s not a warning. We\'ll work out what\'s going wrong and get you back on track in no time.',
              reaction: {
                default: '"Right." She does not look convinced.'
              },
              override: { ownership: -2 },
              debrief: 'Rescuing: it promised an outcome and took the problem onto your shoulders. Kind, and it assumed there was a problem to fix before she had said what it was.'
            },
            {
              id: 'o-s', page: 150, lever: 'observe', quality: 'skilful',
              text: 'You asked if it\'s a warning. It sounds like you\'re expecting to be in trouble.',
              reaction: {
                default: '"Aren\'t I?" A pause. "Everyone\'s been on at me."',
                'extraversion:low': 'She nods, once, and says nothing.'
              },
              override: { trust: 3, ownership: 3 },
              debrief: 'Reflected her own words back. It showed you were listening and let her name what she was afraid of.'
            },
            {
              id: 'o-p', page: 16, lever: 'observe', quality: 'plausible',
              pose: { arms: 'bag' },
              text: 'You\'re holding on to your bag with both hands. It looks like you\'re ready to leave.',
              reaction: {
                default: '"I\'m fine." She loosens her grip a little.'
              },
              debrief: 'An accurate description of what you could see. It pointed at her wish to leave rather than at what she had asked, so she brushed it off.'
            },
            {
              id: 'o-c', page: 85, lever: 'observe', quality: 'clumsy',
              pose: { arms: 'bag', mouth: 'tight' },
              text: 'You asked if it\'s a warning. It sounds like you think you deserve one.',
              reaction: {
                default: '"I didn\'t say that." Her hands tighten on the bag.'
              },
              debrief: 'Began by reflecting her words, then added a meaning she had not given them. It was easy to argue with, and she did.'
            },
            {
              id: 'c-s', page: 8, lever: 'challenge', quality: 'skilful',
              pose: { head: 'up', gaze: 'counsellor' },
              text: 'I don\'t think Mr Okafor sees this as a warning. He told me he doesn\'t think "lazy" is the full story.',
              reaction: {
                default: 'She looks up. "He said that?" She does not seem to know what to do with it.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Offered a different view of why she was here. It questioned her story about being in trouble; how it landed depended on the trust built so far.'
            },
            {
              id: 'c-p', page: 14, lever: 'challenge', quality: 'plausible',
              pose: { gaze: 'floor' },
              text: 'I don\'t think Mr Okafor sees this as a warning. He\'s worried about you and wants to help you catch up.',
              reaction: {
                default: '"Catch up. Right." She looks down at the bag.'
              },
              debrief: 'Offered a kinder view of why she was here, then brought it back to catching up. It eased the fear and kept the grades at the centre.'
            },
            {
              id: 'c-c', page: 33, lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'door' },
              text: 'I don\'t think Mr Okafor sees this as a warning yet. But two missed deadlines is a pattern he can\'t ignore.',
              reaction: {
                default: '"So it is a warning." She looks at the door.'
              },
              override: { trust: -2 },
              debrief: 'Started as reassurance and ended as a verdict. The facts were accurate; "yet" confirmed the fear she came in with.'
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
              id: 'q-s', page: 43, lever: 'question', quality: 'skilful',
              text: 'What\'s happening in those late evenings?',
              reaction: {
                default: '"Nothing. Phone. Videos. Just... not thinking." She stops. "That sounds bad."',
                'extraversion:high': '"Oh, everything. Videos, messages, then it\'s one o\'clock." She laughs, then doesn\'t.'
              },
              override: { trust: 2, ownership: 4 },
              debrief: 'Followed her own words into the detail. She explored, and noticed something about herself.'
            },
            {
              id: 'q-p', page: 326, lever: 'question', quality: 'plausible',
              text: 'What time do you usually get to sleep?',
              reaction: {
                default: '"One? Two, sometimes." She shrugs. "It\'s not that late."'
              },
              debrief: 'A practical question that went straight to the sleep, which is where an adult would look first. She gave you the number and not much else.'
            },
            {
              id: 'q-c', page: 101, lever: 'question', quality: 'clumsy',
              text: 'Have you tried going to bed a bit earlier?',
              reaction: {
                default: '"Yeah. It doesn\'t work." She stops picking at the strap.'
              },
              debrief: 'Advice in the shape of a question. It assumed the answer was the bedtime, and she had already tried that.'
            },
            {
              id: 's-s', page: 39, lever: 'support', quality: 'skilful',
              pose: { shoulders: 'relaxed' },
              text: 'That sounds exhausting. Tired, and then annoyed with yourself for being tired.',
              reaction: {
                default: '"Yeah. Exactly that." She sighs.'
              },
              override: { trust: 3 },
              debrief: 'Named the feeling accurately. She felt understood; the conversation stayed with the feeling rather than moving on.'
            },
            {
              id: 's-p', page: 318, lever: 'support', quality: 'plausible',
              text: 'That sounds exhausting. No wonder starting anything in the evening feels so hard.',
              reaction: {
                default: '"Yeah." She nods. "So it\'s the sleep, I suppose."'
              },
              debrief: 'Validating, and it accepted her explanation whole. She felt understood and settled on tiredness as the full story.'
            },
            {
              id: 's-c', page: 153, lever: 'support', quality: 'clumsy',
              text: 'That sounds exhausting. Try not to worry about it too much, it\'ll sort itself out.',
              reaction: {
                default: '"OK." She seems to have nothing to add.'
              },
              debrief: 'Comforting, and it closed the subject. If it will sort itself out, there is nothing left for her to think about.'
            },
            {
              id: 'o-s', page: 10, lever: 'observe', quality: 'skilful',
              text: 'You said "so I don\'t". You didn\'t say "I can\'t".',
              reaction: {
                default: 'She thinks about it. "I suppose. It\'s easier not to start than to start and be rubbish at it."'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Fed back a detail of her own words. It let her notice a choice inside the habit, and she did the thinking.'
            },
            {
              id: 'o-p', page: 310, lever: 'observe', quality: 'plausible',
              text: 'You started with the late nights, not the work.',
              reaction: {
                default: '"Because that\'s what it is." She shrugs.'
              },
              debrief: 'Noticed the order she told it in, which was accurate. It pointed at the sleep story she had already chosen, so it confirmed it.'
            },
            {
              id: 'o-c', page: 188, lever: 'observe', quality: 'clumsy',
              pose: { arms: 'lap', head: 'down' },
              text: 'You said "so I don\'t". It sounds like you choose not to.',
              reaction: {
                default: '"I don\'t choose it." She pulls her sleeves down over her hands.'
              },
              debrief: 'Took her exact words and turned them into a verdict about her will. She defended herself instead of thinking about it.'
            },
            {
              id: 'c-s', page: 110, lever: 'challenge', quality: 'skilful',
              text: 'Being that tired is real. I wonder if "lazy" is the right word for someone who\'s this tired.',
              reaction: {
                default: '"What else would you call it?" But she is thinking about it.'
              },
              override: { ownership: 3 },
              debrief: 'Questioned her label with care. It offered a new frame; whether she could take it depended on the trust built so far.'
            },
            {
              id: 'c-p', page: 170, lever: 'challenge', quality: 'plausible',
              text: 'Being that tired is real. It sounds more like a sleep problem than a laziness problem.',
              reaction: {
                default: '"Maybe." She considers it, without much interest.'
              },
              debrief: 'Replaced her label with a kinder one of yours. It eased the self-criticism, and the new explanation was still not hers.'
            },
            {
              id: 'c-c', page: 75, lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'window' },
              text: 'Being that tired is real, but staying up is a choice you are making every night.',
              reaction: {
                default: '"I know." Flat. She looks away.'
              },
              debrief: 'Accurate, and it put the whole problem down to her choices. She agreed, and the agreement closed the subject.'
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
              id: 'q-s', page: 139, lever: 'question', quality: 'skilful',
              text: 'What happens in the moment you sit down?',
              reaction: {
                default: '"I look at it and it\'s like... too much. So I do something else."'
              },
              override: { trust: 2, ownership: 4 },
              debrief: 'Slowed down on the exact moment things stall for her. She described it in her own words, which is where ownership starts.'
            },
            {
              id: 'q-p', page: 53, lever: 'question', quality: 'plausible',
              text: 'What is it you\'re meant to be working on?',
              reaction: {
                default: '"Chemistry, mostly. English." She lists it flatly.'
              },
              debrief: 'A useful practical question. It moved to the content of the work and away from what happens to her when she sits down.'
            },
            {
              id: 'q-c', page: 90, lever: 'question', quality: 'clumsy',
              text: 'Is it that the work feels too hard?',
              reaction: {
                default: '"No. I mean, some of it. I don\'t know."'
              },
              debrief: 'Offered her a ready-made reason. It was easy to half-agree with, and it guessed rather than asked.'
            },
            {
              id: 's-s', page: 122, lever: 'support', quality: 'skilful',
              pose: { head: 'down' },
              text: 'That\'s a horrible feeling, wanting to start and not being able to.',
              reaction: {
                default: '"Yeah." Quietly. "It is."'
              },
              override: { trust: 3 },
              debrief: 'Acknowledged the feeling without hurrying her. Trust grew; nothing new came out yet.'
            },
            {
              id: 's-p', page: 215, lever: 'support', quality: 'plausible',
              pose: { gaze: 'floor' },
              text: 'That happens to a lot of people. Starting is often the hardest part.',
              reaction: {
                default: '"I guess." She looks back at the desk.'
              },
              debrief: 'Normalising, and true. It told her she was not alone, and it made her experience general just as she was describing her own.'
            },
            {
              id: 's-c', page: 125, lever: 'support', quality: 'clumsy',
              text: 'Don\'t be so hard on yourself. You\'ll get there when you\'re ready.',
              reaction: {
                default: '"Maybe." She does not sound convinced.'
              },
              debrief: 'Kind, and it skipped past the feeling to a promise. She had just said she could not start; being told she would did not help her see why.'
            },
            {
              id: 'o-s', page: 132, lever: 'observe', quality: 'skilful',
              pose: { head: 'up' },
              text: 'You said "it\'s not like I don\'t try". It sounds like trying matters to you.',
              reaction: {
                default: '"Well, yeah. I\'m not just sitting there doing nothing." She sits up a little.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Reflected back what she valued in her own words. It gave her a better story about herself, and she took it.'
            },
            {
              id: 'o-p', page: 286, lever: 'observe', quality: 'plausible',
              text: 'You said you sit down to do it. So you are getting as far as the desk.',
              reaction: {
                default: '"I suppose." A small shrug.'
              },
              debrief: 'Picked out something she was doing, which is encouraging. It sounded a little like a consolation prize, and she did not take it further.'
            },
            {
              id: 'o-c', page: 196, lever: 'observe', quality: 'clumsy',
              pose: { mouth: 'tight' },
              text: 'You said "it\'s not like I don\'t try". It sounds like you want me to believe that.',
              reaction: {
                default: '"Because it\'s true." Sharper than she meant.'
              },
              debrief: 'Reflected her words with a hint of doubt attached. She heard the doubt and defended herself.'
            },
            {
              id: 'c-s', page: 32, lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'You keep sitting down to do it. That doesn\'t sound like someone who\'s lazy.',
              reaction: {
                default: 'She looks at you. "I suppose not." She does not sound sure.'
              },
              override: { ownership: 4 },
              debrief: 'Pushed back on her label using her own evidence. A strong reframe; it asked her to see herself differently, which takes trust.'
            },
            {
              id: 'c-p', page: 151, lever: 'challenge', quality: 'plausible',
              text: 'You keep sitting down to do it. Maybe the trick is a smaller first step.',
              reaction: {
                default: '"Maybe." She does not seem to know what that would be.'
              },
              debrief: 'Moved straight to a solution. The idea is sensible; it arrived before she understood the problem, so it was your idea to try.'
            },
            {
              id: 'c-c', page: 120, lever: 'challenge', quality: 'clumsy',
              pose: { arms: 'crossed' },
              text: 'You keep sitting down to do it, but sitting there isn\'t the same as doing it.',
              reaction: {
                default: '"I know that." She folds her arms.'
              },
              debrief: 'A fair point, made as a reprimand. It told her something she already knew and left her defending herself.'
            }
          ]
        },
        'r1-03c': {
          page: 26,
          act: 2,
          scene: { pose: { gaze: 'counsellor', arms: 'crossed', shoulders: 'neutral' } },
          line: {
            default: 'I\'m not expecting trouble. I\'m just tired of everyone asking what\'s wrong.',
            from: {
              // after p. 12, Observe (plausible): "You're holding on to your bag with both hands. It ..."
              'r1-02:o-p': 'I\'m not going anywhere. I\'m just tired of everyone asking what\'s wrong.',
              // after p. 12, Observe (skilful): "You asked if it's a warning. It sounds like you're..."
              'r1-02:o-s': 'It\'s not even trouble, really. I\'m just tired of everyone asking what\'s wrong.'
            }
          },
          cue: 'The bag is on the floor now. Her arms are loosely crossed.',
          next: [{ to: 'r1-04a', if: { trust: { min: 45 } } }, { to: 'r1-04b' }],
          options: [
            {
              id: 'q-s', page: 35, lever: 'question', quality: 'skilful',
              text: 'What would you want people to understand, instead of asking?',
              reaction: {
                default: '"That I don\'t know what\'s wrong. That\'s the whole thing."'
              },
              override: { trust: 1, ownership: 4 },
              debrief: 'Turned her complaint into something she could say for herself. She answered honestly, and the not-knowing became the subject.'
            },
            {
              id: 'q-p', page: 17, lever: 'question', quality: 'plausible',
              text: 'What do you usually say when people ask you what\'s wrong?',
              reaction: {
                default: '"That I\'m fine. That I\'m tired." She shrugs. "Same as now."'
              },
              debrief: 'Asked about the pattern she was tired of, which is a reasonable thread. It also had her rehearse the answer she gives everyone.'
            },
            {
              id: 'q-c', page: 103, lever: 'question', quality: 'clumsy',
              text: 'So when they ask, is there something you\'d rather not say?',
              reaction: {
                default: '"No. That\'s what I mean." She sighs.'
              },
              debrief: 'Asked the very question she had just said she was tired of, in a gentler form. She gave the same answer she gives everyone.'
            },
            {
              id: 's-s', page: 182, lever: 'support', quality: 'skilful',
              pose: { mouth: 'slightSmile' },
              text: 'That sounds tiring. I\'ll try not to be one more person asking the same thing.',
              reaction: {
                default: 'A small laugh. "Thanks."'
              },
              override: { trust: 3 },
              debrief: 'Took her side on the thing she found hard, with a light touch. Trust rose; the exploring waited.'
            },
            {
              id: 's-p', page: 38, lever: 'support', quality: 'plausible',
              pose: { gaze: 'floor' },
              text: 'That sounds tiring. People only ask because they care about you, you know.',
              reaction: {
                default: '"I know." She says it to the floor.'
              },
              debrief: 'Defended the people asking, which is fair to them. It asked her to see their side before you had seen hers.'
            },
            {
              id: 's-c', page: 80, lever: 'support', quality: 'clumsy',
              text: 'That sounds tiring. Nothing is wrong with you, so you don\'t need to explain.',
              reaction: {
                default: '"My grades say there is."'
              },
              debrief: 'Reassurance that contradicted the reason she was here. It was kind, and she argued with it.'
            },
            {
              id: 'o-s', page: 30, lever: 'observe', quality: 'skilful',
              text: 'You said "everyone". It sounds like it\'s coming from a lot of directions at once.',
              reaction: {
                default: '"Teachers. Home. Everyone." She stops there.'
              },
              override: { trust: 1, ownership: 4 },
              debrief: 'Picked out one word and reflected its weight. She told you more than she meant to, without being asked directly.'
            },
            {
              id: 'o-p', page: 309, lever: 'observe', quality: 'plausible',
              text: 'You put your bag down a minute ago. You seem a bit more settled than when you came in.',
              reaction: {
                default: '"I suppose." She glances at the bag, then back at you.'
              },
              debrief: 'Accurate and warm. It moved attention to how she was sitting just as she had said something about other people.'
            },
            {
              id: 'o-c', page: 187, lever: 'observe', quality: 'clumsy',
              pose: { arms: 'crossed' },
              text: 'You said "everyone". It sounds like you feel everyone is against you at the moment.',
              reaction: {
                default: '"I didn\'t say against me." Her arms tighten.'
              },
              debrief: 'Went one step beyond her word and made it bigger. She pushed back on the exaggeration and did not add anything.'
            },
            {
              id: 'c-s', page: 113, lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'I don\'t think Mr Okafor asked what was wrong to nag you. He noticed you\'d gone quiet, and that\'s not like you.',
              reaction: {
                default: '"He noticed?" Surprised, then wary.'
              },
              override: { ownership: 3 },
              debrief: 'Offered a different reading of the attention she resented. It could reframe the nagging as care, if she trusted you enough to hear it.'
            },
            {
              id: 'c-p', page: 314, lever: 'challenge', quality: 'plausible',
              text: 'I don\'t think people ask to nag you. Most of them can see you\'re having a hard time this term.',
              reaction: {
                default: '"Maybe." She does not sound convinced.'
              },
              debrief: 'Offered a kinder reading of the people asking. It was general, so it was easy for her to set aside.'
            },
            {
              id: 'c-c', page: 123, lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'window' },
              text: 'I don\'t think people ask to nag you. Your grades have dropped, so it\'s a fair thing for them to ask.',
              reaction: {
                default: '"I didn\'t say it wasn\'t fair." She looks away.'
              },
              debrief: 'A reasonable point, and it took the others\' side. She felt told off rather than heard.'
            }
          ]
        },
        'r1-03d': {
          page: 31,
          act: 2,
          scene: { pose: { gaze: 'door', arms: 'crossed', shoulders: 'raised', mouth: 'tight' } },
          line: {
            default: 'Whatever. I\'m just not bothered any more. It\'s pointless anyway.',
            from: {
              // after p. 12, Challenge (skilful): "I don't think Mr Okafor sees this as a warning. He..."
              'r1-02:c-s': 'Doesn\'t change anything, though. I\'m just not bothered any more. It\'s pointless anyway.'
            }
          },
          cue: {
            default: 'Her arms are folded. She is looking at the clock above the door.',
            from: {
              // after p. 12, Challenge (skilful): "I don't think Mr Okafor sees this as a warning. He..."
              'r1-02:c-s': 'She turns it over for a moment, then folds her arms and looks at the clock above the door.'
            }
          },
          next: [{ to: 'r1-04a', if: { trust: { min: 45 } } }, { to: 'r1-04b' }],
          options: [
            {
              id: 'q-s', page: 172, lever: 'question', quality: 'skilful',
              text: 'What\'s made it feel pointless?',
              reaction: {
                default: 'A long pause. "I don\'t know. It just does."'
              },
              override: { trust: 2, ownership: 2 },
              debrief: 'Stayed curious after a push had landed badly. It kept the door open, although she was not ready to walk through it.'
            },
            {
              id: 'q-p', page: 270, lever: 'question', quality: 'plausible',
              pose: { arms: 'crossed' },
              text: 'What would make it feel worth it?',
              reaction: {
                default: '"Dunno. Nothing, probably." Her arms stay folded.'
              },
              debrief: 'A forward-looking question, asked before she had said why it felt pointless. It was too far ahead of her to answer.'
            },
            {
              id: 'q-c', page: 165, lever: 'question', quality: 'clumsy',
              text: 'Don\'t you care about your grades?',
              reaction: {
                default: '"Of course I care." Too fast.'
              },
              debrief: 'A closed question with a judgement folded into it. She gave the answer it invited, quickly.'
            },
            {
              id: 's-s', page: 57, lever: 'support', quality: 'skilful',
              pose: { gaze: 'counsellor', arms: 'lap' },
              text: 'I pushed a bit fast just then. Sorry. We can slow down.',
              reaction: {
                default: 'She glances at you, surprised. Her arms loosen slightly.'
              },
              override: { trust: 5 },
              debrief: 'Repaired the moment by owning your part in it. Trust recovered; the conversation itself had not moved on yet.'
            },
            {
              id: 's-p', page: 232, lever: 'support', quality: 'plausible',
              text: 'That\'s OK. Lots of people feel like that at some point in school.',
              reaction: {
                default: '"Yeah, well." She keeps looking at the clock.'
              },
              debrief: 'Normalising, which lowers the stakes. It also accepted "pointless" as the end of the matter.'
            },
            {
              id: 's-c', page: 11, lever: 'support', quality: 'clumsy',
              text: 'It\'s not pointless. You\'ve got a lot of potential, you know.',
              reaction: {
                default: '"Everyone says that." She sounds tired.'
              },
              debrief: 'Encouragement that argued with her. She has heard it before, and it told her you had not heard her.'
            },
            {
              id: 'o-s', page: 146, lever: 'observe', quality: 'skilful',
              pose: { gaze: 'counsellor', head: 'up' },
              text: 'You said "any more". So there was a time when you were bothered.',
              reaction: {
                default: '"...Yeah. Last year I actually liked school." She looks surprised that she said it.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Caught a small word that carried a lot. It let her remember a different version of herself without being told to.'
            },
            {
              id: 'o-p', page: 255, lever: 'observe', quality: 'plausible',
              text: 'You keep looking at the clock. It seems like you want this to be over.',
              reaction: {
                default: '"Kind of." She looks at you, then back at the clock.'
              },
              debrief: 'Accurate, and honest about what you saw. It named her wish to leave, which she could only agree with.'
            },
            {
              id: 'o-c', page: 160, lever: 'observe', quality: 'clumsy',
              text: 'You\'ve folded your arms. It looks like you\'ve decided not to talk to me.',
              reaction: {
                default: '"I\'m sitting here, aren\'t I?" She does not move.'
              },
              debrief: 'Read her posture as a decision about you. It made the moment about the relationship, and she held her ground.'
            },
            {
              id: 'c-s', page: 68, lever: 'challenge', quality: 'skilful',
              text: 'Pointless is a strong word. You still came in today, when you could have not.',
              reaction: {
                default: '"I had to come." But she does not get up.'
              },
              override: { ownership: 3 },
              debrief: 'Offered evidence against her own word. It was a fair push; with trust this low it was always going to cost something.'
            },
            {
              id: 'c-p', page: 278, lever: 'challenge', quality: 'plausible',
              text: 'Pointless is a strong word. It can\'t be completely pointless if you\'re still here.',
              reaction: {
                default: '"I had to come." She shrugs.'
              },
              debrief: 'A gentle argument with her word. Logic is easy to answer with a fact, and she had one ready.'
            },
            {
              id: 'c-c', page: 67, lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'door' },
              text: 'Pointless is a strong word. It sounds more like a reason not to bother trying.',
              reaction: {
                default: '"Can you not." She looks at the door.'
              },
              debrief: 'Challenged her word by questioning her motive. It landed as an accusation before there was trust to hold it.'
            }
          ]
        },
        'r1-04a': {
          page: 36,
          act: 2,
          scene: { pose: { gaze: 'phone', arms: 'lap', props: ['phone'] } },
          line: {
            default: 'Like last week. I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
            from: {
              // after p. 26, Challenge (skilful): "I don't think Mr Okafor asked what was wrong to na..."
              'r1-03c:c-s': 'It\'s mostly the work, though. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
              // after p. 26, Observe (clumsy): "You said "everyone". It sounds like you feel every..."
              'r1-03c:o-c': 'It\'s mostly the work, though. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
              // after p. 26, Observe (plausible): "You put your bag down a minute ago. You seem a bit..."
              'r1-03c:o-p': 'It\'s mostly the work, though. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
              // after p. 26, Observe (skilful): "You said "everyone". It sounds like it's coming fr..."
              'r1-03c:o-s': 'It\'s mostly the work, though. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
              // after p. 26, Question (clumsy): "So when they ask, is there something you'd rather ..."
              'r1-03c:q-c': 'It\'s mostly the work, though. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
              // after p. 26, Question (plausible): "What do you usually say when people ask you what's..."
              'r1-03c:q-p': 'It\'s mostly the work, though. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
              // after p. 26, Support (plausible): "That sounds tiring. People only ask because they c..."
              'r1-03c:s-p': 'It\'s mostly the work, though. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
              // after p. 26, Support (skilful): "That sounds tiring. I'll try not to be one more pe..."
              'r1-03c:s-s': 'It\'s mostly the work, though. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.',
              // after p. 31, Support (skilful): "I pushed a bit fast just then. Sorry. We can slow ..."
              'r1-03d:s-s': 'It\'s not that I don\'t care. Last week I had a chemistry thing due. I opened it, looked at it, and then I was on my phone for two hours. Every night it\'s the same.'
            }
          },
          cue: 'When she mentions next year\'s exams, she takes out her phone and turns it over and over in her hand.',
          next: 'r1-05',
          options: [
            {
              id: 'q-s', page: 82, lever: 'question', quality: 'skilful',
              text: 'What goes through your head when you open it?',
              reaction: {
                default: '"That it\'s going to be rubbish anyway. So why bother."'
              },
              override: { trust: 1, ownership: 4 },
              debrief: 'Went underneath the habit to the thought driving it. She named it herself, which is harder to forget than being told.'
            },
            {
              id: 'q-p', page: 268, lever: 'question', quality: 'plausible',
              pose: { gaze: 'phone' },
              text: 'What were you doing on your phone for those two hours?',
              reaction: {
                default: '"Scrolling. Nothing, really." She turns the phone over.'
              },
              debrief: 'Followed the most visible detail. It kept the conversation on the phone rather than on what she was avoiding.'
            },
            {
              id: 'q-c', page: 76, lever: 'question', quality: 'clumsy',
              pose: { props: [] },
              text: 'So is the phone the main problem, do you think?',
              reaction: {
                default: '"I guess." She puts it away, as if caught.'
              },
              debrief: 'A leading question with the answer in it. She agreed, and put the phone out of sight, which hid the cue.'
            },
            {
              id: 's-s', page: 21, lever: 'support', quality: 'skilful',
              text: 'Two hours of avoiding something you\'re dreading. That\'s a hard way to spend an evening.',
              reaction: {
                default: '"It\'s awful, actually. I feel worse after."'
              },
              override: { trust: 3 },
              debrief: 'Recognised how unpleasant the avoiding is. She admitted it out loud; the cue in her hands went unremarked.'
            },
            {
              id: 's-p', page: 74, lever: 'support', quality: 'plausible',
              text: 'Two hours goes quickly on a phone. It happens to everyone, adults included.',
              reaction: {
                default: '"I suppose." She turns the phone over again.'
              },
              debrief: 'Normalised it, which took away some shame. It also made it sound like a phone habit rather than avoidance.'
            },
            {
              id: 's-c', page: 73, lever: 'support', quality: 'clumsy',
              text: 'Two hours is a lot, but everyone puts things off. Try not to worry about it.',
              reaction: {
                default: '"Yeah, but not every night."'
              },
              debrief: 'Reassured her by making it small. She put you right: for her it was every night.'
            },
            {
              id: 'o-s', page: 197, lever: 'observe', quality: 'skilful',
              pose: { props: [], head: 'down' },
              text: 'I noticed you picked up your phone as soon as you mentioned next year.',
              reaction: {
                default: 'She looks at it in her hand, then puts it face down on her knee. "I didn\'t even notice."',
                'extraversion:low': 'She stops turning the phone. A long silence. Then a very small nod.'
              },
              override: { trust: 4, ownership: 5 },
              debrief: 'Used a real, specific cue and did not turn it into a criticism. It showed her a pattern she had not seen for herself.'
            },
            {
              id: 'o-p', page: 290, lever: 'observe', quality: 'plausible',
              text: 'I noticed you said it\'s the same every night. That sounds like a routine now.',
              reaction: {
                default: '"Pretty much." She keeps turning the phone.'
              },
              debrief: 'An accurate reflection of the pattern. It stayed with the evenings and missed the moment the phone came out.'
            },
            {
              id: 'o-c', page: 97, lever: 'observe', quality: 'clumsy',
              pose: { props: [] },
              text: 'I noticed you picked up your phone while we were talking. Is this boring you?',
              reaction: {
                default: '"No. Sorry." She pushes it into her pocket. Her face closes a little.'
              },
              override: { trust: -2 },
              debrief: 'Saw the right thing and read it as rudeness. She apologised and put the phone away, and with it the thing worth noticing.'
            },
            {
              id: 'c-s', page: 88, lever: 'challenge', quality: 'skilful',
              pose: { shoulders: 'raised' },
              text: 'You\'re calling that lazy. It sounds more like you\'re avoiding something.',
              reaction: {
                default: 'She goes still. "Avoiding what?" She does not wait for an answer.'
              },
              override: { ownership: 4 },
              debrief: 'Offered a different explanation for the same behaviour. It went close to the real issue; how close she let it come depended on trust.'
            },
            {
              id: 'c-p', page: 287, lever: 'challenge', quality: 'plausible',
              pose: { gaze: 'phone' },
              text: 'You\'re calling that lazy. It sounds more like the phone is the problem.',
              reaction: {
                default: '"Maybe." She looks at the phone as if it might agree.'
              },
              debrief: 'Swapped her label for a more obvious one. It was easier to accept than "lazy", and it pointed away from what the phone was helping her avoid.'
            },
            {
              id: 'c-c', page: 25, lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'door', props: [] },
              text: 'You\'re calling that lazy. Two hours a night is where the grades have gone.',
              reaction: {
                default: '"Wow. OK." She puts the phone away and looks at the door.'
              },
              debrief: 'Connected the facts accurately and turned them into a verdict. She heard blame rather than a different view.'
            }
          ]
        },
        'r1-04b': {
          page: 40,
          act: 2,
          scene: { pose: { gaze: 'phone', arms: 'crossed', shoulders: 'raised', props: ['phone'] } },
          line: {
            default: 'Dunno. Can\'t be bothered, I guess.',
            from: {
              // after p. 19, Observe (skilful): "You said "so I don't". You didn't say "I can't"."
              'r1-03a:o-s': 'Or I just can\'t be bothered, I guess. Dunno.',
              // after p. 19, Support (skilful): "That sounds exhausting. Tired, and then annoyed wi..."
              'r1-03a:s-s': 'And then I just can\'t be bothered, I guess.',
              // after p. 23, Challenge (skilful): "You keep sitting down to do it. That doesn't sound..."
              'r1-03b:c-s': 'But then I still don\'t do it. Can\'t be bothered, I guess.',
              // after p. 23, Observe (clumsy): "You said "it's not like I don't try". It sounds li..."
              'r1-03b:o-c': 'But I still don\'t do it. So... can\'t be bothered, I guess.',
              // after p. 23, Observe (skilful): "You said "it's not like I don't try". It sounds li..."
              'r1-03b:o-s': 'But I still don\'t do it. So... can\'t be bothered, I guess.',
              // after p. 23, Support (skilful): "That's a horrible feeling, wanting to start and no..."
              'r1-03b:s-s': 'And then I tell myself I can\'t be bothered. It\'s easier, I guess.',
              // after p. 26, Challenge (skilful): "I don't think Mr Okafor asked what was wrong to na..."
              'r1-03c:c-s': 'Well. It\'s not that deep. I just can\'t be bothered, I guess.',
              // after p. 26, Observe (skilful): "You said "everyone". It sounds like it's coming fr..."
              'r1-03c:o-s': 'And I can\'t be bothered explaining any more, I guess. Dunno.',
              // after p. 26, Support (skilful): "That sounds tiring. I'll try not to be one more pe..."
              'r1-03c:s-s': 'It\'s not that deep, anyway. I just can\'t be bothered, I guess.',
              // after p. 31, Observe (skilful): "You said "any more". So there was a time when you ..."
              'r1-03d:o-s': 'Dunno what happened. Now I just can\'t be bothered, I guess.',
              // after p. 31, Question (clumsy): "Don't you care about your grades?"
              'r1-03d:q-c': 'I do. I just can\'t be bothered, I guess. Dunno.',
              // after p. 31, Support (skilful): "I pushed a bit fast just then. Sorry. We can slow ..."
              'r1-03d:s-s': 'It\'s fine. I just... can\'t be bothered, I guess.'
            }
          },
          cue: 'She has her phone out. Each time you mention exams or next year, she looks down at the screen.',
          next: 'r1-05',
          options: [
            {
              id: 'q-s', page: 162, lever: 'question', quality: 'skilful',
              pose: { gaze: 'phone' },
              text: 'What\'s it like when you try to think about next year?',
              reaction: {
                default: 'She shrugs, eyes on the screen. "I don\'t really."'
              },
              override: { trust: 1, ownership: 4 },
              debrief: 'An open question aimed at the right place. With trust this low she could only give a small answer, but it was hers.'
            },
            {
              id: 'q-p', page: 199, lever: 'question', quality: 'plausible',
              pose: { gaze: 'phone' },
              text: 'What subjects are you thinking of taking next year?',
              reaction: {
                default: '"Haven\'t decided." She keeps her eyes on the screen.'
              },
              debrief: 'A practical question about next year. It asked for decisions while the cue was that next year itself was hard to look at.'
            },
            {
              id: 'q-c', page: 174, lever: 'question', quality: 'clumsy',
              pose: { gaze: 'phone' },
              text: 'Are you worried about the exams next year, is that it?',
              reaction: {
                default: '"Not really." She scrolls.'
              },
              debrief: 'Named a feeling for her and asked her to confirm it. A closed question is easy to deflect, and she did.'
            },
            {
              id: 's-s', page: 140, lever: 'support', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'It\'s OK if this is hard to talk about. We don\'t have to rush.',
              reaction: {
                default: 'She looks up from the phone. "OK."'
              },
              override: { trust: 5 },
              debrief: 'Took the pressure off when she was shutting down. Trust recovered; the topic was put on hold.'
            },
            {
              id: 's-p', page: 298, lever: 'support', quality: 'plausible',
              pose: { gaze: 'phone' },
              text: 'It\'s OK. Most people your age can\'t be bothered with exams yet.',
              reaction: {
                default: '"Yeah." She keeps scrolling.'
              },
              debrief: 'Met her where she was, and agreed with "can\'t be bothered". It kept her comfortable and the subject closed.'
            },
            {
              id: 's-c', page: 171, lever: 'support', quality: 'clumsy',
              pose: { gaze: 'phone' },
              text: 'It\'s OK. The exams are ages away, so there\'s nothing to worry about.',
              reaction: {
                default: '"Right." She keeps scrolling.'
              },
              debrief: 'Tried to remove the worry by moving it further away. It did not match what her phone was telling you.'
            },
            {
              id: 'o-s', page: 106, lever: 'observe', quality: 'skilful',
              pose: { arms: 'lap' },
              text: 'Every time next year comes up, you look at your phone. I\'m not telling you off. I noticed it, that\'s all.',
              reaction: {
                default: 'She stops scrolling. A pause. "It\'s easier than thinking about it."',
                'extraversion:low': 'She stops scrolling. She does not look up, but she puts the phone away.'
              },
              override: { trust: 4, ownership: 5 },
              debrief: 'Named the pattern and removed the threat in the same breath. When she was saying least, what she was doing said most.'
            },
            {
              id: 'o-p', page: 266, lever: 'observe', quality: 'plausible',
              pose: { gaze: 'phone' },
              text: 'You\'ve had your phone out most of the time. I\'m not telling you off. I wondered if you\'d noticed.',
              reaction: {
                default: '"Sorry." She puts it face down, but her eyes stay on it.'
              },
              debrief: 'Named the phone without blame. It noticed the habit and missed the pattern of when she reached for it.'
            },
            {
              id: 'o-c', page: 86, lever: 'observe', quality: 'clumsy',
              pose: { gaze: 'phone' },
              text: 'Every time next year comes up, you look at your phone. It\'s hard to talk to you while you\'re on it.',
              reaction: {
                default: '"I\'m listening." She does not look up.'
              },
              override: { trust: -3 },
              debrief: 'Saw the pattern and used it as a complaint. It made the phone a matter of manners rather than something to understand.'
            },
            {
              id: 'c-s', page: 72, lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'window' },
              text: 'I don\'t think you can\'t be bothered. I think something about next year is getting to you.',
              reaction: {
                default: 'She looks up, then away. "Maybe."'
              },
              override: { ownership: 3 },
              debrief: 'Offered a different explanation for "can\'t be bothered". It was close to the truth, and pushing at low trust carries a cost.'
            },
            {
              id: 'c-p', page: 274, lever: 'challenge', quality: 'plausible',
              text: 'I don\'t think you can\'t be bothered. I think you\'re more tired than you\'re letting on.',
              reaction: {
                default: '"Maybe." She shrugs, still scrolling.'
              },
              debrief: 'Pushed back on "can\'t be bothered", which was a fair push. The alternative you offered was a guess, and not the one the cue pointed to.'
            },
            {
              id: 'c-c', page: 94, lever: 'challenge', quality: 'clumsy',
              pose: { chair: 'edge' },
              text: 'I don\'t think you can\'t be bothered. I think you\'re scared of failing the exams.',
              reaction: {
                default: '"I\'m not scared." She half stands up, then sits back down.'
              },
              debrief: 'Named a fear for her, confidently. Even if it was close, being told what she feels made her defend herself.'
            }
          ]
        },
        'r1-05': {
          page: 45,
          act: 2,
          scene: { pose: { gaze: 'window', head: 'down', mouth: 'flat' } },
          line: {
            default: 'Anyway. Everyone\'s already decided what I\'m doing after school.',
            from: {
              // after p. 36, Challenge (clumsy): "You're calling that lazy. Two hours a night is whe..."
              'r1-04a:c-c': 'Doesn\'t matter anyway. Everyone\'s already decided what I\'m doing after school.'
            }
          },
          cue: 'She says it quietly, to the window. She does not explain, and she does not look at you.',
          next: { question: 'r1-06a', support: 'r1-06b', observe: 'r1-06c', challenge: [{ to: 'r1-06d', if: { trust: { min: 50 } } }, { to: 'r1-06e' }], default: 'r1-06a' },
          options: [
            {
              id: 'q-s', page: 49, lever: 'question', quality: 'skilful',
              pose: { head: 'down' },
              text: 'What\'s it like, having that already decided?',
              reaction: {
                default: '"It\'s fine. It\'s just... how it is." Her voice is smaller.'
              },
              override: { trust: 1, ownership: 5 },
              debrief: 'Asked about her experience of the decision rather than the decision itself. She did not explain, but she stayed with it.'
            },
            {
              id: 'q-p', page: 63, lever: 'question', quality: 'plausible',
              pose: { gaze: 'window' },
              text: 'What has everyone decided you\'ll be doing?',
              reaction: {
                default: '"It\'s... a plan. It\'s fine." She keeps looking at the window.'
              },
              debrief: 'The natural next question. It asked for something she had not offered, and kept the attention on what others had decided rather than on her.'
            },
            {
              id: 'q-c', page: 176, lever: 'question', quality: 'clumsy',
              text: 'Who\'s decided that? Is it your family?',
              reaction: {
                default: '"I didn\'t say that." She closes the subject.'
              },
              debrief: 'Put an answer inside the question and named her family before she had. She shut the topic rather than choose to explain.'
            },
            {
              id: 's-s', page: 100, lever: 'support', quality: 'skilful',
              text: 'That sounds like a lot to carry on your own.',
              reaction: {
                default: 'She nods, only just.'
              },
              override: { trust: 3 },
              debrief: 'Acknowledged the weight without prying. It kept her safe; what she meant stayed unsaid.'
            },
            {
              id: 's-p', page: 317, lever: 'support', quality: 'plausible',
              pose: { gaze: 'window' },
              text: 'That\'s a lot. Plenty of people your age feel that.',
              reaction: {
                default: '"I suppose." She keeps looking at the window.'
              },
              debrief: 'Kind, and it filed her experience under something common before you knew what it was.'
            },
            {
              id: 's-c', page: 186, lever: 'support', quality: 'clumsy',
              pose: { gaze: 'floor' },
              text: 'There\'s still plenty of time to work that out.',
              reaction: {
                default: '"Is there?" She looks at the floor.'
              },
              override: { ownership: -2 },
              debrief: 'Tried to lift the weight by giving her more time. Two years from finishing school, it did not match how close it felt to her.'
            },
            {
              id: 'o-s', page: 91, lever: 'observe', quality: 'skilful',
              text: 'You said "everyone\'s decided". I noticed you didn\'t say what you\'d decided.',
              reaction: {
                default: 'She is quiet for a long moment. "No. I didn\'t."'
              },
              override: { trust: 1, ownership: 5 },
              debrief: 'Reflected exactly what she had and had not said. It showed her where she was missing from her own sentence.'
            },
            {
              id: 'o-p', page: 71, lever: 'observe', quality: 'plausible',
              pose: { gaze: 'window' },
              text: 'You said that to the window. It seems hard to say it while looking at me.',
              reaction: {
                default: '"It\'s easier." She glances at you, then back at the window.'
              },
              debrief: 'Noticed something real about how she said it. Commenting on her discomfort drew attention to her rather than to what she had said.'
            },
            {
              id: 'o-c', page: 92, lever: 'observe', quality: 'clumsy',
              pose: { mouth: 'tight' },
              text: 'You said "everyone\'s decided". It sounds like you don\'t agree with them.',
              reaction: {
                default: '"I didn\'t say that." Her mouth tightens.'
              },
              debrief: 'Went one step beyond her words and gave her a position she had not taken. She disowned it rather than explore it.'
            },
            {
              id: 'c-s', page: 156, lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'Maybe. But you\'d be the one living it, so I\'d be interested in what you think too.',
              reaction: {
                default: '"What I think doesn\'t really change anything." But she is looking at you now.'
              },
              override: { ownership: 4 },
              debrief: 'Put her own view back on the table without criticising anyone else\'s. A real push; it needed enough trust to be heard as interest, not as taking sides.'
            },
            {
              id: 'c-p', page: 300, lever: 'challenge', quality: 'plausible',
              pose: { gaze: 'window' },
              text: 'Maybe. But you\'d be the one living it. Is it what you\'d choose yourself?',
              reaction: {
                default: '"I don\'t know. Maybe." She shrugs, still facing the window.'
              },
              debrief: 'A real push, asked as a yes-or-no question before she had said what the decision was. She could only answer it vaguely.'
            },
            {
              id: 'c-c', page: 158, lever: 'challenge', quality: 'clumsy',
              pose: { gaze: 'window' },
              text: 'Maybe. But you\'re the one living it, so they need to hear what you think.',
              reaction: {
                default: '"You don\'t know them." She looks away.'
              },
              override: { trust: -2 },
              debrief: 'Pushed her towards a conversation at home and cast her family as the obstacle. It took a side she had not taken.'
            }
          ]
        },
        'r1-06a': {
          page: 51,
          act: 3,
          scene: { pose: { gaze: 'counsellor', arms: 'lap' } },
          line: {
            default: 'I don\'t know. I just want it to stop feeling like this.',
            from: {
              // after p. 45, Question (clumsy): "Who's decided that? Is it your family?"
              'r1-05:q-c': 'Can we not talk about that? I just want it to stop feeling like this.'
            }
          },
          cue: {
            default: 'She looks at you for the first time in a while.',
            from: {
              // after p. 45, Question (clumsy): "Who's decided that? Is it your family?"
              'r1-05:q-c': 'She looks straight at you, as if daring you to ask again.'
            }
          },
          next: 'r1-07',
          options: [
            {
              id: 'q-s', page: 183, lever: 'question', quality: 'skilful',
              text: 'If things were a bit better two weeks from now, what would be different?',
              reaction: {
                default: 'She thinks. "I\'d have started something. Even one thing. Without it being a whole drama."'
              },
              override: { trust: 2, ownership: 5 },
              debrief: 'Asked her to picture a small, near future. She described a change in her own words, which made it hers.'
            },
            {
              id: 'q-p', page: 301, lever: 'question', quality: 'plausible',
              pose: { gaze: 'window' },
              text: 'What do you think is the main thing making it feel like this?',
              reaction: {
                default: '"I don\'t know. Everything?" She looks away again.'
              },
              debrief: 'A fair question about causes. She had just turned towards wanting a change, and it turned her back to the problem.'
            },
            {
              id: 'q-c', page: 28, lever: 'question', quality: 'clumsy',
              text: 'Do you want to feel better about school by the time we next meet?',
              reaction: {
                default: '"Well, yes."'
              },
              debrief: 'A closed question with only one possible answer. It got a yes and no picture of what better would be.'
            },
            {
              id: 's-s', page: 15, lever: 'support', quality: 'skilful',
              pose: { shoulders: 'relaxed' },
              text: 'That makes sense. Feeling stuck every evening sounds draining.',
              reaction: {
                default: '"It is." She breathes out.'
              },
              override: { trust: 3 },
              debrief: 'Stayed with the feeling she had just named. She felt heard; the future stayed unexplored.'
            },
            {
              id: 's-p', page: 297, lever: 'support', quality: 'plausible',
              text: 'That makes sense. It will stop, though. Things like this usually pass.',
              reaction: {
                default: '"I hope so." She does not sound sure.'
              },
              debrief: 'Hopeful, and it arrived before she had said what "this" was. It promised an end without anything for her to do.'
            },
            {
              id: 's-c', page: 126, lever: 'support', quality: 'clumsy',
              text: 'That makes sense. Let\'s work out together how to make it stop, then.',
              reaction: {
                default: '"OK." She waits for you to start.'
              },
              debrief: 'Generous and practical, and it took the lead from her. "Together" quickly became you doing the working out.'
            },
            {
              id: 'o-s', page: 117, lever: 'observe', quality: 'skilful',
              text: 'When you said that, you sat up a little. It sounds like you want things to change.',
              reaction: {
                default: '"I do. I just don\'t know how."'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Linked what you saw to what she said. It let her hear her own wish for change.'
            },
            {
              id: 'o-p', page: 159, lever: 'observe', quality: 'plausible',
              pose: { gaze: 'window' },
              text: 'When you said that, you looked at me. It\'s the first time you\'ve done that today.',
              reaction: {
                default: '"Is it?" She looks away again.'
              },
              debrief: 'Accurate, and it made her aware of being watched. She stepped back from the moment you had noticed.'
            },
            {
              id: 'o-c', page: 24, lever: 'observe', quality: 'clumsy',
              pose: { chair: 'back' },
              text: 'When you said that, you sat up a little. It sounds like you know what to do about it.',
              reaction: {
                default: '"Do I?" She slumps back in the chair.'
              },
              debrief: 'Read her wish for change as knowing the answer. It put pressure on her to have one.'
            },
            {
              id: 'c-s', page: 109, lever: 'challenge', quality: 'skilful',
              text: 'I think you have more say over how this feels than it seems right now.',
              reaction: {
                default: '"Like what?" Doubtful, but curious.'
              },
              override: { ownership: 3 },
              debrief: 'Challenged her sense of helplessness. A hopeful push; it needed trust to sound like belief rather than blame.'
            },
            {
              id: 'c-p', page: 291, lever: 'challenge', quality: 'plausible',
              text: 'I think it\'ll start to feel better once the homework is under control.',
              reaction: {
                default: '"Maybe." She does not sound convinced.'
              },
              debrief: 'A sensible view from the outside. It made the homework the answer before she had said what would help.'
            },
            {
              id: 'c-c', page: 143, lever: 'challenge', quality: 'clumsy',
              text: 'I think it won\'t stop by itself, though. Something will have to change.',
              reaction: {
                default: '"I know that." Flat.'
              },
              debrief: 'True, and said as a warning. It told her what she already knew and gave her nothing to work with.'
            }
          ]
        },
        'r1-06b': {
          page: 54,
          act: 3,
          scene: { pose: { gaze: 'floor', arms: 'lap', shoulders: 'relaxed' } },
          line: {
            default: 'Yeah. It is a lot. I don\'t really talk about it.',
            from: {
              // after p. 45, Support (clumsy): "There's still plenty of time to work that out."
              'r1-05:s-c': 'Doesn\'t feel like it. It\'s a lot. I don\'t really talk about it.'
            }
          },
          cue: 'Her shoulders drop. She does not seem in a hurry to leave.',
          next: 'r1-07',
          options: [
            {
              id: 'q-s', page: 83, lever: 'question', quality: 'skilful',
              text: 'If the next two weeks went a bit better, what would you notice first?',
              reaction: {
                default: '"That I\'d done some homework without it being a whole thing." A small shrug.'
              },
              override: { trust: 2, ownership: 5 },
              debrief: 'Moved from comfort to the future at the moment she felt safest. She did the picturing herself.'
            },
            {
              id: 'q-p', page: 220, lever: 'question', quality: 'plausible',
              text: 'Who would you feel able to talk to about it, outside school?',
              reaction: {
                default: '"I don\'t know. No one, really." She shrugs.'
              },
              debrief: 'A caring question that looked for support beyond this room. It moved away from the conversation she had just started having with you.'
            },
            {
              id: 'q-c', page: 189, lever: 'question', quality: 'clumsy',
              text: 'Would it help to talk about it more often, maybe here with me?',
              reaction: {
                default: '"Maybe."'
              },
              debrief: 'A kind offer as a closed question. She said maybe; it did not ask what she wanted.'
            },
            {
              id: 's-s', page: 129, lever: 'support', quality: 'skilful',
              text: 'I\'m glad you\'re talking about it now.',
              reaction: {
                default: '"Me too. I think."'
              },
              override: { trust: 2, ownership: -1 },
              debrief: 'Warm and true. More comfort at this point kept her safe, and it kept the next step with you.'
            },
            {
              id: 's-p', page: 329, lever: 'support', quality: 'plausible',
              text: 'I\'m glad. Talking always helps.',
              reaction: {
                default: '"I guess." She smiles a little.'
              },
              debrief: 'Warm, and a general rule. It praised the talking and moved past what she had said.'
            },
            {
              id: 's-c', page: 44, lever: 'support', quality: 'clumsy',
              text: 'You can come to me. I\'ll sort it out.',
              reaction: {
                default: '"OK." She looks relieved, and a little let off.'
              },
              debrief: 'Generous, and it took the problem off her. Relief is not the same as a step of her own.'
            },
            {
              id: 'o-s', page: 27, lever: 'observe', quality: 'skilful',
              pose: { mouth: 'slightSmile' },
              text: 'You said you don\'t really talk about it. You\'re talking about it now.',
              reaction: {
                default: '"Yeah. Weird." A small smile.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Showed her something she was already doing differently. Small, and it was hers.'
            },
            {
              id: 'o-p', page: 34, lever: 'observe', quality: 'plausible',
              text: 'You said you don\'t really talk about it. That must make it feel heavier.',
              reaction: {
                default: '"I suppose." She shrugs.'
              },
              debrief: 'An empathic guess about how it felt. It was probably close, and it told her the feeling rather than letting her name it.'
            },
            {
              id: 'o-c', page: 164, lever: 'observe', quality: 'clumsy',
              pose: { chair: 'back' },
              text: 'You said it\'s a lot. You look as if it\'s all getting on top of you.',
              reaction: {
                default: '"I\'m fine." She sits up straighter, as if to prove it.'
              },
              debrief: 'Described her state rather than what you saw or heard. She had just admitted something, and the label made her take it back.'
            },
            {
              id: 'c-s', page: 198, lever: 'challenge', quality: 'skilful',
              text: 'Not talking about it is one way to cope. I\'m not sure it\'s working for you.',
              reaction: {
                default: '"...No. It isn\'t."'
              },
              override: { ownership: 3 },
              debrief: 'Questioned her way of coping, gently. A push that relied on the warmth already there.'
            },
            {
              id: 'c-p', page: 241, lever: 'challenge', quality: 'plausible',
              text: 'Not talking about it is one way to cope. It might help to tell someone at home.',
              reaction: {
                default: '"Maybe." She does not look keen.'
              },
              debrief: 'A reasonable suggestion, made early. It pointed her towards home before you knew what home meant in this.'
            },
            {
              id: 'c-c', page: 96, lever: 'challenge', quality: 'clumsy',
              text: 'Not talking about it is one way to cope, but you\'ll need to start talking at some point.',
              reaction: {
                default: '"I guess."'
              },
              debrief: 'A fair point as an instruction. She agreed, and the instruction was yours.'
            }
          ]
        },
        'r1-06c': {
          page: 58,
          act: 3,
          scene: { pose: { gaze: 'counsellor', mouth: 'tight' } },
          line: {
            default: '...I didn\'t say what I want, did I.',
            from: {
              // after p. 45, Observe (plausible): "You said that to the window. It seems hard to say ..."
              'r1-05:o-p': 'It\'s easier than saying what I want. ...Which I didn\'t, did I.'
            }
          },
          cue: 'A short laugh that is not really a laugh.',
          next: 'r1-07',
          options: [
            {
              id: 'q-s', page: 48, lever: 'question', quality: 'skilful',
              text: 'What would you want the next two weeks to look like?',
              reaction: {
                default: '"Less of this. Less being annoyed at myself at eleven at night." She pauses. "Actually starting things."'
              },
              override: { trust: 2, ownership: 5 },
              debrief: 'Gave her the question she had just asked herself. She answered it, which made the future hers.'
            },
            {
              id: 'q-p', page: 293, lever: 'question', quality: 'plausible',
              pose: { gaze: 'window' },
              text: 'What do you think you might want to do after school?',
              reaction: {
                default: '"I don\'t know." She looks at the window. "Something."'
              },
              debrief: 'The big question, asked at the first opening. It was too large a step from "I didn\'t say what I want".'
            },
            {
              id: 'q-c', page: 99, lever: 'question', quality: 'clumsy',
              text: 'Do you know what you want, deep down, or not yet?',
              reaction: {
                default: '"No." Quickly.'
              },
              debrief: 'A closed question that made her choose between knowing and not knowing. "No" was the quick way out.'
            },
            {
              id: 's-s', page: 148, lever: 'support', quality: 'skilful',
              text: 'That\'s OK. It\'s not easy to know what you want at sixteen.',
              reaction: {
                default: '"Everyone else seems to know."'
              },
              override: { trust: 3 },
              debrief: 'Normalised not knowing, kindly. It eased the pressure, and it eased the question away too.'
            },
            {
              id: 's-p', page: 281, lever: 'support', quality: 'plausible',
              text: 'That\'s OK. You don\'t need to know yet. There\'s plenty of time.',
              reaction: {
                default: '"OK." She lets it go.'
              },
              debrief: 'Took the pressure off, which she may have needed. It also closed the door she had just opened.'
            },
            {
              id: 's-c', page: 157, lever: 'support', quality: 'clumsy',
              text: 'That\'s OK. We can work out what you want together, step by step.',
              reaction: {
                default: '"OK." She lets you take it.'
              },
              debrief: 'A generous offer of help. "Together" put you in charge of finding out what she wanted.'
            },
            {
              id: 'o-s', page: 142, lever: 'observe', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'You laughed, but it didn\'t sound like you found it funny.',
              reaction: {
                default: '"No. It isn\'t." She looks at you properly.'
              },
              override: { ownership: 3 },
              debrief: 'Noticed the gap between her laugh and her face. It let her drop the act without being told to.'
            },
            {
              id: 'o-p', page: 313, lever: 'observe', quality: 'plausible',
              pose: { gaze: 'floor' },
              text: 'You said that quietly, as if you\'d noticed it for the first time.',
              reaction: {
                default: '"Kind of." She looks at her hands.'
              },
              debrief: 'A gentle, accurate observation. It stayed with how she said it rather than with what she had realised.'
            },
            {
              id: 'o-c', page: 115, lever: 'observe', quality: 'clumsy',
              text: 'You laughed, but it sounds like you don\'t know what you want.',
              reaction: {
                default: '"Thanks." The laugh is gone.'
              },
              debrief: 'Started with what you saw and ended with a conclusion about her. The conclusion stung.'
            },
            {
              id: 'c-s', page: 130, lever: 'challenge', quality: 'skilful',
              pose: { gaze: 'counsellor' },
              text: 'I think you might have more of an idea than you\'re letting yourself say.',
              reaction: {
                default: 'She looks at you for a long moment. "Maybe."'
              },
              override: { ownership: 4 },
              debrief: 'Pushed on her not-knowing. With trust in place it can feel like belief in her; without it, like pressure.'
            },
            {
              id: 'c-p', page: 289, lever: 'challenge', quality: 'plausible',
              text: 'I think you might want something different from what everyone has decided.',
              reaction: {
                default: '"Maybe." She does not say what.'
              },
              debrief: 'A perceptive guess, said for her. It may have been close; she could agree without owning it.'
            },
            {
              id: 'c-c', page: 77, lever: 'challenge', quality: 'clumsy',
              text: 'I think you need to work out what you want, then, before someone else does.',
              reaction: {
                default: '"Yeah. I know."'
              },
              debrief: 'Pushed for urgency and hinted at others deciding for her. It took a side and added pressure.'
            }
          ]
        },
        'r1-06d': {
          page: 62,
          act: 3,
          scene: { pose: { gaze: 'window', chair: 'back' } },
          line: {
            default: 'I suppose. I just don\'t know what I\'d change.',
            from: {
              // after p. 45, Challenge (clumsy): "Maybe. But you're the one living it, so they need ..."
              'r1-05:c-c': 'Sorry. It\'s me living it, I suppose. I just don\'t know what I\'d change.'
            }
          },
          cue: {
            default: 'She sits back and thinks. She has not looked at the door for a while.',
            from: {
              // after p. 45, Challenge (clumsy): "Maybe. But you're the one living it, so they need ..."
              'r1-05:c-c': 'After a moment she turns to the window, thinking. She has not looked at the door for a while.'
            }
          },
          next: 'r1-07',
          options: [
            {
              id: 'q-s', page: 181, lever: 'question', quality: 'skilful',
              text: 'If it were two weeks from now and things were slightly better, what would you see?',
              reaction: {
                default: '"Me doing chemistry before my phone. Maybe." She seems surprised by her own answer.'
              },
              override: { trust: 2, ownership: 5 },
              debrief: 'Followed a push with an open question. The push opened the door; the question let her walk through it.'
            },
            {
              id: 'q-p', page: 271, lever: 'question', quality: 'plausible',
              text: 'What do you think would make the biggest difference to your grades right now?',
              reaction: {
                default: '"Doing the homework, I guess." It sounds like the expected answer.'
              },
              debrief: 'Asked for her view, on the grades and on the biggest change. She gave the answer she knew was expected.'
            },
            {
              id: 'q-c', page: 55, lever: 'question', quality: 'clumsy',
              text: 'Would getting your homework in on time be a good change to start with?',
              reaction: {
                default: '"I guess."'
              },
              debrief: 'Your change, phrased as a question. A yes was easy and did not commit her to anything.'
            },
            {
              id: 's-s', page: 50, lever: 'support', quality: 'skilful',
              pose: { mouth: 'smile' },
              text: 'Not knowing yet is fine. You\'ve thought about a lot today.',
              reaction: {
                default: '"Yeah. My head hurts a bit." A smile.'
              },
              override: { trust: 2 },
              debrief: 'Recognised the effort she had made. Trust rose; the change she might make stayed undefined.'
            },
            {
              id: 's-p', page: 251, lever: 'support', quality: 'plausible',
              text: 'Not knowing yet is fine. We can always come back to it next time.',
              reaction: {
                default: '"OK." She seems a little relieved.'
              },
              debrief: 'Gave her room, which was kind. It let her off just as she had started thinking.'
            },
            {
              id: 's-c', page: 185, lever: 'support', quality: 'clumsy',
              text: 'Not knowing yet is fine. I\'ll help you work out what to change.',
              reaction: {
                default: '"OK." She waits for you to tell her.'
              },
              debrief: 'Offered help, and in doing so took over the thinking. She waited for your answer.'
            },
            {
              id: 'o-s', page: 179, lever: 'observe', quality: 'skilful',
              text: 'You\'ve stopped looking at the door. You seem to be thinking about this.',
              reaction: {
                default: '"I am, actually."'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Showed her the change in her own behaviour. It affirmed her engagement without telling her what to think.'
            },
            {
              id: 'o-p', page: 144, lever: 'observe', quality: 'plausible',
              pose: { gaze: 'door' },
              text: 'You\'ve sat back in the chair. You seem more relaxed than when you came in.',
              reaction: {
                default: '"I suppose." She glances at the door, then back.'
              },
              debrief: 'Accurate and warm. It noticed the comfort and missed the thinking, and drew her eye back to the door.'
            },
            {
              id: 'o-c', page: 18, lever: 'observe', quality: 'clumsy',
              text: 'You\'ve stopped looking at the door. You seem to know what needs to change.',
              reaction: {
                default: '"I don\'t, though."'
              },
              debrief: 'Read her thinking as knowing. It put her on the spot to have an answer.'
            },
            {
              id: 'c-s', page: 60, lever: 'challenge', quality: 'skilful',
              pose: { mouth: 'tight' },
              text: 'I think you already have one idea. You don\'t trust it yet, that\'s all.',
              reaction: {
                default: '"...Maybe the phone thing." She pulls a face.'
              },
              override: { ownership: 5 },
              debrief: 'A second push, made with trust already in place. It worked because it pointed at her idea, not yours.'
            },
            {
              id: 'c-p', page: 193, lever: 'challenge', quality: 'plausible',
              text: 'I think the phone might be the place to start. It came up a few times.',
              reaction: {
                default: '"Maybe." She pulls a face.'
              },
              debrief: 'A sensible starting point, offered by you. She could accept it without it being hers.'
            },
            {
              id: 'c-c', page: 78, lever: 'challenge', quality: 'clumsy',
              text: 'I think you have to change something, or nothing will change, will it?',
              reaction: {
                default: '"Yeah, I get it."'
              },
              debrief: 'True, and said as pressure. It asked her to agree rather than to think.'
            }
          ]
        },
        'r1-06e': {
          page: 64,
          act: 3,
          scene: { pose: { gaze: 'door', arms: 'bag', chair: 'edge', shoulders: 'raised' } },
          line: {
            default: 'You don\'t get it.',
            from: {
              // after p. 45, Challenge (plausible): "Maybe. But you'd be the one living it. Is it what ..."
              'r1-05:c-p': 'It\'s not that simple, though. You don\'t get it.',
              // after p. 45, Challenge (skilful): "Maybe. But you'd be the one living it, so I'd be i..."
              'r1-05:c-s': 'It doesn\'t. You don\'t get it.'
            }
          },
          cue: {
            default: 'She pulls her bag back onto her lap.',
            from: {
              // after p. 45, Challenge (skilful): "Maybe. But you'd be the one living it, so I'd be i..."
              'r1-05:c-s': 'She holds your look for a moment, then glances at the door and pulls her bag back onto her lap.'
            }
          },
          next: 'r1-07',
          options: [
            {
              id: 'q-s', page: 56, lever: 'question', quality: 'skilful',
              text: 'You\'re right, I might not. What am I missing?',
              reaction: {
                default: 'A pause. "It\'s not about being lazy. It\'s just... a lot."'
              },
              override: { trust: 3, ownership: 4 },
              debrief: 'Accepted her criticism and turned it into curiosity. It recovered some ground and let her put you right.'
            },
            {
              id: 'q-p', page: 263, lever: 'question', quality: 'plausible',
              pose: { arms: 'bag' },
              text: 'You\'re right, I might not. Is it after school?',
              reaction: {
                default: '"Partly." She keeps the bag on her lap.'
              },
              debrief: 'Owned the gap and then filled it with a guess. She confirmed part of it and kept the rest.'
            },
            {
              id: 'q-c', page: 108, lever: 'question', quality: 'clumsy',
              pose: { arms: 'bag' },
              text: 'You\'re right. Can you help me get it, then?',
              reaction: {
                default: '"Not really." Her hands stay on the bag.'
              },
              debrief: 'Agreed, then put the work of explaining back on her. At that moment, the "then" sounded like a test.'
            },
            {
              id: 's-s', page: 135, lever: 'support', quality: 'skilful',
              pose: { arms: 'lap' },
              text: 'That\'s fair. I pushed. I\'d still like to understand, if you\'ll let me.',
              reaction: {
                default: 'She hesitates, then puts the bag down.'
              },
              override: { trust: 5 },
              debrief: 'Repaired the rupture openly. Trust came back; there was less time left to use it.'
            },
            {
              id: 's-p', page: 262, lever: 'support', quality: 'plausible',
              pose: { arms: 'bag' },
              text: 'That\'s fair. Sorry. I was only trying to help you, that\'s all.',
              reaction: {
                default: '"I know." She keeps the bag on her lap.'
              },
              debrief: 'Apologised, which helped, and then explained yourself. It made the repair about your intentions.'
            },
            {
              id: 's-c', page: 134, lever: 'support', quality: 'clumsy',
              text: 'That\'s fair. But I do get it more than you think. I was sixteen once.',
              reaction: {
                default: '"Not like this."'
              },
              debrief: 'Tried to close the gap by sharing your own past. She heard that you knew better.'
            },
            {
              id: 'o-s', page: 47, lever: 'observe', quality: 'skilful',
              pose: { arms: 'bag', chair: 'edge' },
              text: 'You\'ve picked up your bag. I think I pushed too hard a moment ago.',
              reaction: {
                default: '"A bit." The bag stays on her lap, but she does not stand.'
              },
              override: { trust: 1, ownership: 2 },
              debrief: 'Read the bag accurately and said so without blame. Naming the rupture helped repair it.'
            },
            {
              id: 'o-p', page: 282, lever: 'observe', quality: 'plausible',
              pose: { arms: 'bag' },
              text: 'You\'ve picked up your bag. Do you want to stop for today?',
              reaction: {
                default: '"No. I don\'t know." She does not stand.'
              },
              debrief: 'Respected her signal and offered her the door. It was considerate, and it left the repair to her.'
            },
            {
              id: 'o-c', page: 37, lever: 'observe', quality: 'clumsy',
              pose: { arms: 'bag' },
              text: 'You\'ve picked up your bag. You seem quite worked up about this.',
              reaction: {
                default: '"I\'m not worked up." Her voice is louder.'
              },
              debrief: 'Saw the bag and labelled her feeling. A label is easy to deny, and she did.'
            },
            {
              id: 'c-s', page: 22, lever: 'challenge', quality: 'skilful',
              text: 'Maybe I don\'t. But I don\'t think you\'ve given up, either.',
              reaction: {
                default: '"How would you know?" But she stays.'
              },
              override: { ownership: 3 },
              debrief: 'Held your ground and expressed belief in her. A second push while she was upset; a risk, and she stayed.'
            },
            {
              id: 'c-p', page: 302, lever: 'challenge', quality: 'plausible',
              text: 'Maybe I don\'t. But it would help if you told me, then.',
              reaction: {
                default: '"Maybe." She does not start.'
              },
              debrief: 'A logical push. It was reasonable, and it asked her to do the repair.'
            },
            {
              id: 'c-c', page: 121, lever: 'challenge', quality: 'clumsy',
              pose: { chair: 'edge' },
              text: 'Maybe I don\'t. But I think you don\'t want to hear it, either.',
              reaction: {
                default: 'She stands up. Then, slowly, she sits down again.'
              },
              debrief: 'Matched her push with one of your own. It turned the moment into a stand-off.'
            }
          ]
        },
        'r1-07': {
          page: 70,
          act: 3,
          scene: { pose: { gaze: 'counsellor' } },
          line: {
            default: 'So what am I supposed to do, then?',
            from: {
              // after p. 51, Question (skilful): "If things were a bit better two weeks from now, wh..."
              'r1-06a:q-s': 'Even one thing would do. I just don\'t know which. So what am I supposed to do?',
              // after p. 54, Question (skilful): "If the next two weeks went a bit better, what woul..."
              'r1-06b:q-s': 'Homework without the drama. But how? What am I supposed to do?',
              // after p. 58, Question (skilful): "What would you want the next two weeks to look lik..."
              'r1-06c:q-s': 'Actually starting things. But I don\'t know how. What am I supposed to do?',
              // after p. 62, Challenge (skilful): "I think you already have one idea. You don't trust..."
              'r1-06d:c-s': 'The phone thing, maybe. But then what? What am I supposed to do?',
              // after p. 62, Question (skilful): "If it were two weeks from now and things were slig..."
              'r1-06d:q-s': 'Chemistry before my phone. Is that even a plan? What am I supposed to do?'
            }
          },
          cue: 'She glances at the clock. The bell will ring soon.',
          next: null, // last page: the round ends after this choice
          options: [
            {
              id: 'q-s', page: 65, lever: 'question', quality: 'skilful',
              pose: { gaze: 'window' },
              text: 'What\'s one small thing you\'d want to try before we meet again?',
              reaction: {
                default: 'She thinks for a while. "Maybe... do the chemistry first. Before my phone. Just to see."'
              },
              override: { trust: 1, ownership: 5 },
              debrief: 'Asked her for the next step and waited. Whatever she chose, it was hers to try.'
            },
            {
              id: 'q-p', page: 230, lever: 'question', quality: 'plausible',
              text: 'What do you think would help most with the homework deadlines?',
              reaction: {
                default: '"Start earlier, I guess." It sounds like something she has been told.'
              },
              debrief: 'Invited her answer, on the deadlines that brought her here. She gave the answer she knew was expected.'
            },
            {
              id: 'q-c', page: 141, lever: 'question', quality: 'clumsy',
              text: 'Could you try handing in the next piece of homework on time?',
              reaction: {
                default: '"I can try." She says it to the clock.'
              },
              override: { ownership: -2 },
              debrief: 'Your step, phrased as a question. A yes was easy to give and easy to forget.'
            },
            {
              id: 's-s', page: 175, lever: 'support', quality: 'skilful',
              pose: { shoulders: 'relaxed' },
              text: 'You don\'t have to fix everything this week. We can meet again in two weeks and see how things are.',
              reaction: {
                default: '"OK. Yeah." She seems lighter.'
              },
              override: { trust: 2, ownership: -1 },
              debrief: 'Took the pressure off and kept the relationship going. She left lighter, without a step of her own.'
            },
            {
              id: 's-p', page: 3, lever: 'support', quality: 'plausible',
              text: 'You don\'t have to fix everything this week. Even one finished piece of homework would be a good start.',
              reaction: {
                default: '"OK. I\'ll try." She nods, a bit too quickly.'
              },
              debrief: 'Encouraging, and it chose the step for her. She agreed to a reasonable target that was yours.'
            },
            {
              id: 's-c', page: 154, lever: 'support', quality: 'clumsy',
              pose: { chair: 'back', shoulders: 'relaxed' },
              text: 'You don\'t have to fix everything this week. I\'ll have a word with your teachers about the deadlines.',
              reaction: {
                default: '"Oh. OK. Thanks." She relaxes. The problem is yours now.'
              },
              override: { ownership: -4 },
              debrief: 'Generous, and it took the problem off her. It also promised something that depended on other staff.'
            },
            {
              id: 'o-s', page: 69, lever: 'observe', quality: 'skilful',
              pose: { gaze: 'window' },
              text: 'You\'ve talked about the moment you sit down and then stop. That moment seems to matter.',
              reaction: {
                default: '"Yeah. If I could just get past the first bit..." She trails off, thinking.'
              },
              override: { ownership: 3 },
              debrief: 'Gave her back a thread from her own words and left the conclusion to her. She started to build on it.'
            },
            {
              id: 'o-p', page: 283, lever: 'observe', quality: 'plausible',
              text: 'You\'ve talked about your phone a few times. That seems to be where the evening goes.',
              reaction: {
                default: '"Yeah. I could leave it downstairs, I guess." She does not sound sure.'
              },
              debrief: 'An accurate thread from her own words, picked because it pointed at an obvious fix. She took the fix you had pointed to.'
            },
            {
              id: 'o-c', page: 42, lever: 'observe', quality: 'clumsy',
              text: 'You\'ve talked about the work in a lot of detail. It sounds like you already know what to do.',
              reaction: {
                default: '"Not really. That\'s why I\'m here."'
              },
              debrief: 'Assumed she had an answer she did not have. It left her with the pressure and none of the help.'
            },
            {
              id: 'c-s', page: 52, lever: 'challenge', quality: 'skilful',
              pose: { head: 'up' },
              text: 'I could give you a plan, but it would be my plan. I\'d rather hear yours, even if it\'s small.',
              reaction: {
                default: 'She looks surprised. Then: "OK. Let me think."'
              },
              override: { ownership: 5 },
              debrief: 'Refused to take the problem off her, kindly. It is a push; with enough trust it hands her the pen.'
            },
            {
              id: 'c-p', page: 285, lever: 'challenge', quality: 'plausible',
              text: 'I could give you a plan, but plans from me don\'t usually stick. Shall we make one together?',
              reaction: {
                default: '"OK. If you want." She waits for you to start.'
              },
              debrief: 'Offered partnership, which sounds generous. As a yes-or-no question it left you holding the pen.'
            },
            {
              id: 'c-c', page: 61, lever: 'challenge', quality: 'clumsy',
              pose: { arms: 'bag', chair: 'edge', gaze: 'door' },
              text: 'I could give you a plan, but you\'d need to stick to it this time. Are you up for that?',
              reaction: {
                default: '"This time?" She picks up her bag.'
              },
              debrief: '"This time" carried a judgement about last time. The push landed on her past rather than her next step.'
            }
          ]
        }
      },
      // How the round can end (SPEC.md 7.7). `text` is shown on the ending
      // page; `summary` is the one line on the debrief's ending card. Where
      // `text` has a `from` list, that text replaces the default when the
      // round ends straight after that page and option (SPEC.md 9.5).
      endings: {
        breakthrough: { title: 'Breakthrough', summary: 'Maya proposed a next step of her own, and asked to come back.',
          text: {
            default: 'Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. At the door she turns round. "Same time in two weeks?"',
            from: {
              // after p. 70, Challenge (clumsy): "I could give you a plan, but you'd need to stick t..."
              'r1-07:c-c': 'She gets as far as the door, then turns back. "Fine. But I\'ll pick it." Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. "Same time in two weeks?"',
              // after p. 70, Challenge (plausible): "I could give you a plan, but plans from me don't u..."
              'r1-07:c-p': 'Then, before you start: "Actually... I\'ve got an idea." Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. At the door she turns round. "Same time in two weeks?"',
              // after p. 70, Observe (clumsy): "You've talked about the work in a lot of detail. I..."
              'r1-07:o-c': 'Then she thinks again. "Well. Maybe one thing." Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. At the door she turns round. "Same time in two weeks?"',
              // after p. 70, Question (clumsy): "Could you try handing in the next piece of homewor..."
              'r1-07:q-c': 'Then she looks back from the clock. "Or... could I try something I picked?" Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. At the door she turns round. "Same time in two weeks?"',
              // after p. 70, Question (plausible): "What do you think would help most with the homewor..."
              'r1-07:q-p': 'Then she shakes her head. "That\'s what everyone says. What I\'d actually try is..." Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. At the door she turns round. "Same time in two weeks?"',
              // after p. 70, Support (clumsy): "You don't have to fix everything this week. I'll h..."
              'r1-07:s-c': 'Then she shakes her head. "Actually, don\'t. I want to sort it myself." Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. At the door she turns round. "Same time in two weeks?"',
              // after p. 70, Support (plausible): "You don't have to fix everything this week. Even o..."
              'r1-07:s-p': 'Then she stops nodding. "Actually... can I choose the thing?" Maya proposes her own next step: one small thing she will try before you meet again. She says it slowly, as if checking that it belongs to her. At the door she turns round. "Same time in two weeks?"'
            }
          }
        },
        partial: { title: 'Agreement without ownership', summary: 'Maya agreed to the step you suggested. The plan stayed yours.',
          text: {
            default: 'Maya agrees to the step you suggest. "OK. I\'ll try." She means it, mostly. But it is your plan, not hers, and you can both feel it.',
            from: {
              // after p. 70, Challenge (skilful): "I could give you a plan, but it would be my plan. ..."
              'r1-07:c-s': 'She thinks, but nothing comes, and in the end you offer a step after all. "OK. I\'ll try." She means it, mostly. But it is your plan, not hers, and you can both feel it.',
              // after p. 70, Observe (plausible): "You've talked about your phone a few times. That s..."
              'r1-07:o-p': '"Or... I don\'t know. What would you do?" Maya agrees to the step you suggest. "OK. I\'ll try." She means it, mostly. But it is your plan, not hers, and you can both feel it.',
              // after p. 70, Question (skilful): "What's one small thing you'd want to try before we..."
              'r1-07:q-s': 'Then she shakes her head. "Or... I don\'t know. What do you think?" Maya agrees to the step you suggest. "OK. I\'ll try." She means it, mostly. But it is your plan, not hers, and you can both feel it.'
            }
          }
        },
        // ownershipNote: shown in the debrief when a Polite exit ends with high
        // ownership (enough for a Breakthrough) but too little trust.
        polite: { title: 'Polite exit', summary: 'Maya stayed polite from start to finish and left unmoved.',
          text: {
            default: '"Thanks for this." Maya picks up her bag and leaves on time. She was polite from start to finish. Nothing much has changed.',
            from: {
              // after p. 70, Question (skilful): "What's one small thing you'd want to try before we..."
              'r1-07:q-s': '"Anyway. Thanks for this." Maya picks up her bag and leaves on time, without saying whether she will really try it. She was polite from start to finish. Nothing much has changed.'
            }
          },
          ownershipNote: 'She did a lot of her own thinking: ownership ended high. Trust stayed below the level where she would commit to a step out loud, so the ideas left the room with her.' },
        early: { title: 'Early exit', summary: 'Trust ran out, and Maya left before the conversation really began.',
          text: {
            default: '"Can I go now?" Maya is already standing, bag on her shoulder. The conversation is over before it really began.',
            from: {
              // after p. 26, Challenge (skilful): "I don't think Mr Okafor asked what was wrong to na..."
              'r1-03c:c-s': 'She thinks about it for a second, then stands, bag on her shoulder. "Can I go now?" The conversation is over before it really began.',
              // after p. 31, Challenge (skilful): "Pointless is a strong word. You still came in toda..."
              'r1-03d:c-s': 'A moment later she does get up, bag on her shoulder. "Can I go now?" The conversation is over before it really began.',
              // after p. 31, Observe (clumsy): "You've folded your arms. It looks like you've deci..."
              'r1-03d:o-c': 'A moment later she does get up, bag on her shoulder. "Can I go now?" The conversation is over before it really began.',
              // after p. 40, Challenge (clumsy): "I don't think you can't be bothered. I think you'r..."
              'r1-04b:c-c': 'Then she stands again, properly this time, bag on her shoulder. "Can I go now?" The conversation is over before it really began.',
              // after p. 45, Challenge (skilful): "Maybe. But you'd be the one living it, so I'd be i..."
              'r1-05:c-s': 'She thinks about it for a second, then stands, bag on her shoulder. "Can I go now?" The conversation is over before it really began.',
              // after p. 51, Challenge (clumsy): "I think it won't stop by itself, though. Something..."
              'r1-06a:c-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 51, Challenge (plausible): "I think it'll start to feel better once the homewo..."
              'r1-06a:c-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 51, Challenge (skilful): "I think you have more say over how this feels than..."
              'r1-06a:c-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 51, Observe (clumsy): "When you said that, you sat up a little. It sounds..."
              'r1-06a:o-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 51, Observe (plausible): "When you said that, you looked at me. It's the fir..."
              'r1-06a:o-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 51, Observe (skilful): "When you said that, you sat up a little. It sounds..."
              'r1-06a:o-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 51, Question (clumsy): "Do you want to feel better about school by the tim..."
              'r1-06a:q-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 51, Question (plausible): "What do you think is the main thing making it feel..."
              'r1-06a:q-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 54, Challenge (clumsy): "Not talking about it is one way to cope, but you'l..."
              'r1-06b:c-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 54, Challenge (plausible): "Not talking about it is one way to cope. It might ..."
              'r1-06b:c-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 54, Challenge (skilful): "Not talking about it is one way to cope. I'm not s..."
              'r1-06b:c-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 54, Observe (clumsy): "You said it's a lot. You look as if it's all getti..."
              'r1-06b:o-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 54, Observe (plausible): "You said you don't really talk about it. That must..."
              'r1-06b:o-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 58, Challenge (clumsy): "I think you need to work out what you want, then, ..."
              'r1-06c:c-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 58, Challenge (plausible): "I think you might want something different from wh..."
              'r1-06c:c-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 58, Challenge (skilful): "I think you might have more of an idea than you're..."
              'r1-06c:c-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 58, Observe (clumsy): "You laughed, but it sounds like you don't know wha..."
              'r1-06c:o-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 58, Observe (plausible): "You said that quietly, as if you'd noticed it for ..."
              'r1-06c:o-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 58, Observe (skilful): "You laughed, but it didn't sound like you found it..."
              'r1-06c:o-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 58, Question (clumsy): "Do you know what you want, deep down, or not yet?"
              'r1-06c:q-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 64, Challenge (clumsy): "Maybe I don't. But I think you don't want to hear ..."
              'r1-06e:c-c': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 64, Challenge (plausible): "Maybe I don't. But it would help if you told me, t..."
              'r1-06e:c-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 64, Challenge (skilful): "Maybe I don't. But I don't think you've given up, ..."
              'r1-06e:c-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 64, Observe (clumsy): "You've picked up your bag. You seem quite worked u..."
              'r1-06e:o-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 64, Observe (plausible): "You've picked up your bag. Do you want to stop for..."
              'r1-06e:o-p': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 64, Observe (skilful): "You've picked up your bag. I think I pushed too ha..."
              'r1-06e:o-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 64, Question (clumsy): "You're right. Can you help me get it, then?"
              'r1-06e:q-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 70, Challenge (clumsy): "I could give you a plan, but you'd need to stick t..."
              'r1-07:c-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 70, Challenge (plausible): "I could give you a plan, but plans from me don't u..."
              'r1-07:c-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 70, Challenge (skilful): "I could give you a plan, but it would be my plan. ..."
              'r1-07:c-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 70, Observe (clumsy): "You've talked about the work in a lot of detail. I..."
              'r1-07:o-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 70, Observe (plausible): "You've talked about your phone a few times. That s..."
              'r1-07:o-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 70, Observe (skilful): "You've talked about the moment you sit down and th..."
              'r1-07:o-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.',
              // after p. 70, Question (clumsy): "Could you try handing in the next piece of homewor..."
              'r1-07:q-c': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 70, Question (plausible): "What do you think would help most with the homewor..."
              'r1-07:q-p': '"Can I go now?" Maya is already standing, bag on her shoulder. Whatever had started to open has closed again.',
              // after p. 70, Question (skilful): "What's one small thing you'd want to try before we..."
              'r1-07:q-s': 'A moment later she stands anyway, bag on her shoulder. "Can I go now?" Whatever had started to open has closed again.'
            }
          }
        }
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
              id: 'q', page: 173, lever: 'question',
              text: 'What helped, in the week it worked?',
              reaction: {
                default: '"I just did it before I could think about it." A pause. "Then I got a bad mark in chemistry and sort of stopped."'
              },
              debrief: 'Started with what went well, in her words. It kept the check-in about learning rather than about keeping a promise.'
            },
            {
              id: 's', page: 95, lever: 'support',
              pose: { mouth: 'slightSmile' },
              text: 'Well done for trying it. I\'m really proud of you.',
              reaction: {
                default: '"Thanks." A small smile that does not quite reach her eyes. "It didn\'t last, though."'
              },
              override: { trust: -3, ownership: -3 },
              debrief: 'Warm praise, and it put you in the role of judge. It felt good for a moment and moved the focus from what she learned to what you thought of it.'
            },
            {
              id: 'o', page: 213, lever: 'observe',
              pose: { head: 'up' },
              text: 'You look quite pleased about that week, even though it stopped.',
              reaction: {
                default: '"I am, a bit." She sits up. "I didn\'t think I\'d manage any of it."'
              },
              debrief: 'Noticed the pride she had not mentioned. It let her own the success before discussing the setback.'
            },
            {
              id: 'c', page: 258, lever: 'challenge',
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
              id: 'q', page: 247, lever: 'question',
              pose: { gaze: 'counsellor', head: 'up' },
              text: 'What got in the way, do you think?',
              reaction: {
                default: '"I don\'t know." She sits. "I think I said yes because you wanted me to." She looks up, checking.'
              },
              debrief: 'Asked about the gap between agreeing and doing, without blame. It let her name the difference herself.'
            },
            {
              id: 's', page: 246, lever: 'support',
              pose: { shoulders: 'relaxed' },
              text: 'That\'s OK. Two weeks goes quickly. I\'m glad you came back.',
              reaction: {
                default: '"Yeah." Relief, and then nothing more.'
              },
              debrief: 'Took the sting out of forgetting. It eased her guilt and left the reason for forgetting untouched.'
            },
            {
              id: 'o', page: 235, lever: 'observe',
              text: 'You said sorry before you sat down. It sounds like you were expecting me to be cross.',
              reaction: {
                default: '"Aren\'t you?" A pause. "It was your idea, not mine. So I didn\'t really think about it."'
              },
              debrief: 'Reflected what her apology suggested. It brought out how she had experienced the agreed step: as yours.'
            },
            {
              id: 'c', page: 168, lever: 'challenge',
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
              id: 'q', page: 242, lever: 'question',
              text: 'OK. What have the last two weeks been like, then?',
              reaction: {
                default: '"Same. School, home, homework I don\'t do." A small shrug.'
              },
              override: { trust: 1 },
              debrief: 'Accepted her "nothing" and asked about her experience anyway. A low-pressure way back in.'
            },
            {
              id: 's', page: 201, lever: 'support',
              pose: { mouth: 'slightSmile' },
              text: 'Thanks for coming back. That counts for something.',
              reaction: {
                default: '"Mr Okafor made me." But she smiles slightly.'
              },
              override: { trust: 3, ownership: 1 },
              debrief: 'Valued her being there at all. A warm restart after a session that went nowhere.'
            },
            {
              id: 'o', page: 233, lever: 'observe',
              text: 'You said that before I could ask. It sounds like you thought I\'d be disappointed.',
              reaction: {
                default: '"Maybe." She shifts in her seat.'
              },
              override: { trust: 1 },
              debrief: 'Read the defence in her opening line. Accurate; at low trust it can feel like being seen through.'
            },
            {
              id: 'c', page: 248, lever: 'challenge',
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
              id: 'q', page: 167, lever: 'question',
              text: 'That\'s fair. What would make it worth staying for ten minutes?',
              reaction: {
                default: '"I don\'t know. If you didn\'t go on about my grades, maybe."'
              },
              override: { trust: 2 },
              debrief: 'Let her set the terms for staying. She got some control back, although she was still on the edge of the chair.'
            },
            {
              id: 's', page: 237, lever: 'support',
              pose: { arms: 'lap', gaze: 'counsellor' },
              text: 'Last time didn\'t go well, and I think I pushed too hard. I\'m sorry. You can set the pace today.',
              reaction: {
                default: 'She looks surprised. "OK." She lets the bag slide off her shoulder.'
              },
              override: { trust: 3, ownership: 5 },
              debrief: 'Owned the last session openly. It rebuilt trust and asked nothing of her yet.'
            },
            {
              id: 'o', page: 210, lever: 'observe',
              text: 'You\'ve sat right by the door. It looks like you want to be able to leave.',
              reaction: {
                default: '"Kind of." She does not move, but she does not leave either.'
              },
              override: { trust: 2, ownership: 2 },
              debrief: 'Named what her position said, and allowed it. Honest; with so little trust it could easily feel watched.'
            },
            {
              id: 'c', page: 149, lever: 'challenge',
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
          line: {
            default: 'The thing is, even when I do the work, it doesn\'t feel like it\'s for anything.',
            from: {
              // after p. 89, Challenge: "You're here, though. Part of you must want somethi..."
              'r2-01d:c': 'Whatever. Even when I do the work, it doesn\'t feel like it\'s for anything.',
              // after p. 89, Question: "That's fair. What would make it worth staying for ..."
              'r2-01d:q': 'It\'s not even the grades. Even when I do the work, it doesn\'t feel like it\'s for anything.'
            }
          },
          cue: 'She picks up the course brochure from your desk, turns a page, then puts it down quickly.',
          next: [{ to: 'r2-03a', if: { trust: { min: 45 } } }, { to: 'r2-03b', if: { trust: { min: 30 } } }, { to: 'r2-03c' }],
          options: [
            {
              id: 'q', page: 226, lever: 'question',
              text: 'What would it need to be for, to feel worth it?',
              reaction: {
                default: '"I don\'t know. Something I actually..." She stops. "Never mind."',
                'readiness:mid': '"Something I actually chose, I suppose." She looks at the brochure.'
              },
              debrief: 'Asked about purpose, which is where this was heading. She came close to saying it, in her own time.'
            },
            {
              id: 's', page: 177, lever: 'support',
              text: 'That sounds really flat. Working hard for something that doesn\'t feel like yours.',
              reaction: {
                default: '"Yeah. It is." She looks at the brochure again.'
              },
              override: { trust: 2 },
              debrief: 'Put words to the feeling and stayed with her. She felt understood; the brochure went unremarked.'
            },
            {
              id: 'o', page: 254, lever: 'observe',
              text: 'You picked up that brochure and put it down very fast.',
              reaction: {
                default: '"It\'s nothing. Just... my mum has one like it at home."'
              },
              debrief: 'Used the cue in front of you. It led straight to the real subject without your having to name it.'
            },
            {
              id: 'c', page: 212, lever: 'challenge',
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
          line: {
            default: 'My mum brought one of these home. Medicine. It\'s kind of... already the plan.',
            from: {
              // after p. 93, Observe: "You picked up that brochure and put it down very f..."
              'r2-02:o': 'Medicine. That\'s what hers is for. It\'s kind of... already the plan.'
            }
          },
          cue: 'She taps the cover of the brochure. She does not sound unhappy. She does not sound happy, either.',
          next: [{ to: 'r2-04a', if: { trust: { min: 45 } } }, { to: 'r2-04b' }],
          options: [
            {
              id: 'q', page: 250, lever: 'question',
              text: 'What do you make of the plan?',
              reaction: {
                default: '"It\'s a good plan. Being a doctor is a good job." A pause. "It\'s just not me, I don\'t think."'
              },
              debrief: 'An open question about her view, with no view of your own in it. It made room for her to disagree with the plan without disagreeing with her family.'
            },
            {
              id: 's', page: 225, lever: 'support',
              pose: { head: 'down' },
              text: 'It sounds like your family really cares about how things turn out for you.',
              reaction: {
                default: '"They do. They really do." She sounds almost guilty.'
              },
              override: { trust: -3, ownership: -3 },
              debrief: 'Respected her family\'s intentions, which is fair to them. Said just as she was opening up, it made anything she wanted sound ungrateful, and her own wishes stayed unspoken.'
            },
            {
              id: 'o', page: 222, lever: 'observe',
              text: 'You said "already the plan". Not "my plan".',
              reaction: {
                default: 'She is quiet. "Yeah. I noticed that too."'
              },
              debrief: 'Reflected her exact words. It showed her where she was in her own sentence, without anyone being blamed.'
            },
            {
              id: 'c', page: 261, lever: 'challenge',
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
              id: 'q', page: 195, lever: 'question',
              text: 'What\'s that like for you?',
              reaction: {
                default: '"Fine. I mean, it\'s a good thing to do." She does not sound convinced by her own voice.'
              },
              override: { trust: 3, ownership: 5 },
              debrief: 'Asked about her experience of the expectation, not the expectation itself. She answered politely, and her tone said more.'
            },
            {
              id: 's', page: 221, lever: 'support',
              pose: { head: 'up' },
              text: 'That\'s a big expectation to grow up with. It makes sense that it weighs on you.',
              reaction: {
                default: '"Yeah." She looks up. "I don\'t want to let them down."'
              },
              override: { trust: 3, ownership: 1 },
              debrief: 'Acknowledged the weight without criticising anyone. It made it safe to say what she feared.'
            },
            {
              id: 'o', page: 260, lever: 'observe',
              pose: { head: 'down' },
              text: 'You said "my parents want". You didn\'t say what you want.',
              reaction: {
                default: '"Because it doesn\'t matter." Quietly.'
              },
              override: { trust: -3 },
              debrief: 'Pointed at the gap in her sentence. Accurate; at this level of trust it brought out her hopelessness rather than her wishes.'
            },
            {
              id: 'c', page: 234, lever: 'challenge',
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
              id: 'q', page: 136, lever: 'question',
              text: 'What have they worked out?',
              reaction: {
                default: '"Medicine. Obviously." A flat voice.'
              },
              override: { trust: 2, ownership: 3 },
              debrief: 'A simple, open question. It got the fact; at this level of trust, not the feeling.'
            },
            {
              id: 's', page: 194, lever: 'support',
              pose: { arms: 'lap' },
              text: 'You don\'t have to talk about home if you don\'t want to. I\'m listening either way.',
              reaction: {
                default: 'Her arms loosen a little. "It\'s fine. It\'s just medicine. They want me to be a doctor." She says it as if deciding to.'
              },
              override: { trust: 3, ownership: 5 },
              debrief: 'Gave her permission not to talk, which made talking her own choice. Trust came first; the detail followed, on her terms.'
            },
            {
              id: 'o', page: 229, lever: 'observe',
              pose: { gaze: 'counsellor' },
              text: 'You looked at the door as soon as your family came up.',
              reaction: {
                default: '"I didn\'t." She looks back at you, a bit too quickly.'
              },
              override: { trust: 2, ownership: 3 },
              debrief: 'Named a real cue. With trust this low, being seen felt more like being caught.'
            },
            {
              id: 'c', page: 118, lever: 'challenge',
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
              id: 'q', page: 116, lever: 'question',
              pose: { arms: 'gesturing', mouth: 'smile' },
              text: 'What is it about design that you like?',
              reaction: {
                default: 'She talks for longer than she has all term: colours, layouts, the poster she made for the school play. Then she stops. "Anyway."',
                'readiness:mid': 'She talks for longer than she has all term: colours, layouts, the poster she made for the school play. "I\'d actually love to do that properly."'
              },
              debrief: 'Invited her to talk about what she cares about. She came alive, and the "no point" lost some of its grip.'
            },
            {
              id: 's', page: 245, lever: 'support',
              text: 'It\'s clear that matters to you. It\'s OK to care about something.',
              reaction: {
                default: '"I know. It\'s just complicated."'
              },
              override: { trust: -3, ownership: -3 },
              debrief: 'Gave her permission she had not asked for. Kind, though it sounded like reassurance for a younger student, and the "no point" went unexamined.'
            },
            {
              id: 'o', page: 192, lever: 'observe',
              pose: { mouth: 'slightSmile' },
              text: 'You smiled when you said "design". Then you stopped.',
              reaction: {
                default: '"Did I?" She smiles again, then catches herself. "It\'s silly."'
              },
              debrief: 'Noticed the smile and its disappearance. It showed her, without argument, that the interest was real.'
            },
            {
              id: 'c', page: 214, lever: 'challenge',
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
          line: {
            default: 'I used to draw a lot. Design stuff. There\'s no point even thinking about it now.',
            from: {
              // after p. 105, Challenge: "I'm not sure it's as worked out as you're making i..."
              'r2-03c:c': 'They\'re not like that. ...I used to draw a lot, though. Design stuff. There\'s no point even thinking about it now.'
            }
          },
          cue: {
            default: 'She is turning the brochure over and over in her hands.',
            from: {
              // after p. 98, Challenge: "Is it the plan, though? You're the one who'd be st..."
              'r2-03a:c': 'She picks the brochure up again and turns it over and over in her hands.'
            }
          },
          next: 'r2-05',
          options: [
            {
              id: 'q', page: 227, lever: 'question',
              pose: { arms: 'lap' },
              text: 'What did you use to draw?',
              reaction: {
                default: '"Rooms, mostly. How I\'d change them. Posters." Her hands stop moving.'
              },
              override: { trust: 2 },
              debrief: 'A concrete, easy question about something she loved. It brought back the interest before the "no point".'
            },
            {
              id: 's', page: 239, lever: 'support',
              text: 'It sounds like you miss it.',
              reaction: {
                default: '"I do." She sounds surprised to hear herself say it.'
              },
              override: { trust: 3, ownership: 5 },
              debrief: 'Named the loss underneath "no point". She agreed, and felt it.'
            },
            {
              id: 'o', page: 104, lever: 'observe',
              pose: { arms: 'lap' },
              text: 'You\'re turning the brochure over and over while you talk about it.',
              reaction: {
                default: 'She stops. Puts it down. "Habit."'
              },
              override: { trust: -3, ownership: 2 },
              debrief: 'Pointed at the restless hands. True; she was not ready to make anything of it.'
            },
            {
              id: 'c', page: 223, lever: 'challenge',
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
          line: {
            default: 'They\'d never listen anyway. They\'ve wanted this since I was little. They work so hard for me.',
            from: {
              // after p. 114, Observe: "You're turning the brochure over and over while yo..."
              'r2-04b:o': 'Doesn\'t matter anyway. They\'d never listen. They\'ve wanted this since I was little. They work so hard for me.'
            }
          },
          cue: 'She looks at the floor. Her voice goes quiet on "so hard".',
          next: { question: 'r2-06a', observe: 'r2-06a', support: 'r2-06b', challenge: [{ to: 'r2-06c', if: { trust: { min: 50 } } }, { to: 'r2-06d' }], default: 'r2-06a' },
          options: [
            {
              id: 'q', page: 205, lever: 'question',
              pose: { shoulders: 'relaxed' },
              text: 'What would you want them to hear, if they did listen?',
              reaction: {
                default: '"That I\'m not ungrateful. That I just... might want something else." A long breath.'
              },
              override: { trust: 1 },
              debrief: 'Asked about her message rather than their reaction. It brought out what she wanted without setting her against them.'
            },
            {
              id: 's', page: 203, lever: 'support',
              text: 'It\'s clear how much you love them. Wanting them to be proud of you makes sense.',
              reaction: {
                default: '"I do want that." She nods slowly, and the subject closes.'
              },
              debrief: 'Honoured her loyalty to her family. It calmed her, and it closed the subject just as it opened.'
            },
            {
              id: 'o', page: 244, lever: 'observe',
              pose: { mouth: 'slightSmile' },
              text: 'You said they\'d never listen, and then straight away that they work so hard for you. Both seem true for you.',
              reaction: {
                default: '"Yeah. That\'s the problem." She almost laughs.'
              },
              override: { ownership: -2 },
              debrief: 'Reflected both halves of what she said. It let her hold the conflict without having to choose a side.'
            },
            {
              id: 'c', page: 216, lever: 'challenge',
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
              id: 'q', page: 238, lever: 'question',
              pose: { arms: 'gesturing' },
              text: 'What would you want to find out?',
              reaction: {
                default: '"What you actually do. Where you can study it. If it\'s a real job." She counts on her fingers.'
              },
              debrief: 'Let her build her own list. Each item was hers, which made the next step easier to own.'
            },
            {
              id: 's', page: 252, lever: 'support',
              text: 'That sounds like a sensible place to start.',
              reaction: {
                default: '"Yeah." She nods, and waits for you to say what comes next.'
              },
              debrief: 'Approved her idea. Encouraging; it also put you in charge of what happens next.'
            },
            {
              id: 'o', page: 219, lever: 'observe',
              pose: { chair: 'leaningIn' },
              text: 'You leaned forward when you said that.',
              reaction: {
                default: '"Did I?" She does not lean back.'
              },
              override: { trust: 2, ownership: -2 },
              debrief: 'Showed her that her body was ahead of her words. A small, real piece of evidence that she cares.'
            },
            {
              id: 'c', page: 137, lever: 'challenge',
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
              id: 'q', page: 204, lever: 'question',
              text: 'If you could change one small thing about it, what would it be?',
              reaction: {
                default: '"I\'d want them to know I like design. Even if nothing else changes."'
              },
              override: { trust: 2 },
              debrief: 'Moved from comfort to a small change, once she felt safe. She named something she wanted.'
            },
            {
              id: 's', page: 202, lever: 'support',
              pose: { chair: 'back' },
              text: 'It is a lot. Go easy on yourself.',
              reaction: {
                default: '"Yeah." She puts the brochure down. The conversation drifts.'
              },
              override: { ownership: -2 },
              debrief: 'More comfort when she was already comforted. Kind, and the momentum went.'
            },
            {
              id: 'o', page: 209, lever: 'observe',
              text: 'You\'re still holding the brochure. Part of you hasn\'t put this down.',
              reaction: {
                default: '"I suppose not." She looks at it.'
              },
              override: { ownership: -3 },
              debrief: 'Linked what she held to what she felt. It kept the subject alive without pushing.'
            },
            {
              id: 'c', page: 256, lever: 'challenge',
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
              id: 'q', page: 147, lever: 'question',
              text: 'What do you think might happen if you did?',
              reaction: {
                default: '"Mum would be surprised. Dad would ask loads of questions." A pause. "They\'d probably listen. In the end."'
              },
              debrief: 'Invited her to test her own assumption in imagination. She revised it herself, which is more convincing than being told.'
            },
            {
              id: 's', page: 206, lever: 'support',
              pose: { mouth: 'slightSmile' },
              text: 'That took courage to say.',
              reaction: {
                default: '"It doesn\'t feel brave." But she smiles.'
              },
              override: { ownership: -2 },
              debrief: 'Recognised the moment. It made her feel good about the insight and paused the thinking.'
            },
            {
              id: 'o', page: 155, lever: 'observe',
              text: 'You sound almost surprised at what you just said.',
              reaction: {
                default: '"I am. I always thought I knew what they\'d say."'
              },
              debrief: 'Reflected the surprise in her voice. It helped her notice that something had changed in her.'
            },
            {
              id: 'c', page: 200, lever: 'challenge',
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
              id: 'q', page: 190, lever: 'question',
              pose: { shoulders: 'relaxed' },
              text: 'You\'re right, I don\'t. What are they like?',
              reaction: {
                default: '"They\'re... nice. Strict. They worry a lot." She softens slightly.'
              },
              override: { ownership: 1 },
              debrief: 'Accepted her point and asked to learn. It let her describe her family fairly, which lowered her guard.'
            },
            {
              id: 's', page: 253, lever: 'support',
              text: 'You\'re right. I don\'t, and I shouldn\'t have assumed. I\'m sorry.',
              reaction: {
                default: 'She pauses. "They\'re not bad people. They just want me to be OK."'
              },
              debrief: 'Repaired the rupture without defending yourself. Trust returned, and she defended her parents, which is fair to them.'
            },
            {
              id: 'o', page: 217, lever: 'observe',
              text: 'You pushed the brochure away when I said that.',
              reaction: {
                default: '"Because you don\'t get it." But she leaves her hand near it.'
              },
              debrief: 'Named what she did with the brochure. Accurate; it kept the focus on her reaction rather than on repair.'
            },
            {
              id: 'c', page: 228, lever: 'challenge',
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
          line: {
            default: 'So what do I do? I can\'t just walk in and say "I don\'t want to be a doctor".',
            from: {
              // after p. 124, Observe: "You leaned forward when you said that."
              'r2-06a:o': 'And then what? Even if I found out everything, I can\'t just walk in and say "I don\'t want to be a doctor".',
              // after p. 124, Question: "What would you want to find out?"
              'r2-06a:q': 'And then what? Even if I found out everything, I can\'t just walk in and say "I don\'t want to be a doctor".',
              // after p. 124, Support: "That sounds like a sensible place to start."
              'r2-06a:s': 'And then what? Even if I found out everything, I can\'t just walk in and say "I don\'t want to be a doctor".',
              // after p. 127, Support: "It is a lot. Go easy on yourself."
              'r2-06b:s': 'I don\'t even know what I\'d do. I can\'t just walk in and say "I don\'t want to be a doctor".',
              // after p. 133, Challenge: "I don't know them. But I'm not sure you know what ..."
              'r2-06d:c': 'Anyway. Even if you were right, I can\'t just walk in and say "I don\'t want to be a doctor".',
              // after p. 133, Observe: "You pushed the brochure away when I said that."
              'r2-06d:o': '...Fine. So what would I even do? I can\'t just walk in and say "I don\'t want to be a doctor".'
            }
          },
          cue: {
            default: 'She is looking straight at you.',
            from: {
              // after p. 127, Support: "It is a lot. Go easy on yourself."
              'r2-06b:s': 'She looks up from the brochure, as if she has only just thought of it.',
              // after p. 133, Challenge: "I don't know them. But I'm not sure you know what ..."
              'r2-06d:c': 'She looks back from the clock, straight at you.'
            }
          },
          next: null, // last page: the round ends after this choice
          options: [
            {
              id: 'q', page: 236, lever: 'question',
              text: 'If you did want to raise it at home, how would you want that conversation to go?',
              reaction: {
                default: '"Calmly. Not at dinner." She thinks. "Maybe if I had some stuff to show them first. Or if you were there."',
                'readiness:low': '"I don\'t know. Calmly, I suppose." She thinks. "Not yet, anyway."'
              },
              debrief: 'Asked her to design the next step. Whatever she chose, the plan was hers.'
            },
            {
              id: 's', page: 240, lever: 'support',
              pose: { gaze: 'counsellor' },
              text: 'Whatever you decide, I\'m here to help you think it through.',
              reaction: {
                default: '"Thanks." She nods, and waits.'
              },
              override: { ownership: -1 },
              debrief: 'A steady offer of help. It kept the door open and left the step undefined.'
            },
            {
              id: 'o', page: 107, lever: 'observe',
              pose: { mouth: 'slightSmile' },
              text: 'You said "I can\'t just walk in". It sounds like you\'ve already started picturing it.',
              reaction: {
                default: '"...I have, kind of." A nervous laugh.'
              },
              override: { trust: 2, ownership: -2 },
              debrief: 'Caught the plan hidden inside her objection. It let her see she was further on than she thought.'
            },
            {
              id: 'c', page: 243, lever: 'challenge',
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
      // page; `summary` is the one line on the debrief's ending card. Where
      // `text` has a `from` list, that text replaces the default when the
      // round ends straight after that page and option (SPEC.md 9.5).
      endings: {
        breakthrough: { title: 'Breakthrough', summary: 'Maya chose her own next step, and how she wants to raise it at home.',
          text: {
            default: 'Maya proposes her own next step. This week she will look up two design courses, properly, and write down what she finds. Then she wants to talk to her mum, at the weekend and not over dinner. "Could you be there? Not to talk for me. Just... there."',
            from: {
              // after p. 138, Question: "If you did want to raise it at home, how would you..."
              'r2-07:q': 'She thinks a little longer. "Actually... maybe I could do it soon." Maya proposes her own next step. This week she will look up two design courses, properly, and write down what she finds. Then she wants to talk to her mum, at the weekend and not over dinner. "Could you be there? Not to talk for me. Just... there."',
              // after p. 138, Support: "Whatever you decide, I'm here to help you think it..."
              'r2-07:s': 'You wait too. After a moment she fills the silence herself. Maya proposes her own next step. This week she will look up two design courses, properly, and write down what she finds. Then she wants to talk to her mum, at the weekend and not over dinner. "Could you be there? Not to talk for me. Just... there."'
            }
          }
        },
        partial: { title: 'Agreement without ownership', summary: 'Maya agreed to look at the course you suggested. The step stayed yours.',
          text: {
            default: 'Maya agrees to the step you suggest. "OK. I\'ll look at the website." She takes the brochure with her. You are not sure she will open it.',
            from: {
              // after p. 138, Question: "If you did want to raise it at home, how would you..."
              'r2-07:q': '"But I don\'t know. What do you think I should do first?" Maya agrees to the step you suggest. "OK. I\'ll look at the website." She takes the brochure with her. You are not sure she will open it.'
            }
          }
        },
        // ownershipNote: as in Round 1, for a Polite exit with high ownership and too little trust.
        polite: { title: 'Polite exit', summary: 'A pleasant conversation. The brochure stayed on the desk.',
          text: {
            default: '"Thanks. I\'ll think about it." She leaves the brochure on the desk. It was a pleasant conversation. Nothing moved.',
            from: {
              // after p. 138, Challenge: "You don't have to make a speech. But I don't think..."
              'r2-07:c': 'She does not say what the "OK" was for. "Thanks. I\'ll think about it." She leaves the brochure on the desk. It was a pleasant conversation. Nothing moved.',
              // after p. 138, Question: "If you did want to raise it at home, how would you..."
              'r2-07:q': '"Anyway. Thanks. I\'ll think about it." She leaves the brochure on the desk. It was a pleasant conversation. Whatever she was picturing, she keeps it to herself.'
            }
          },
          ownershipNote: 'Ownership ended high: the thinking was hers. Trust stayed below the level where she would say a next step out loud, so it went home unspoken.' },
        early: { title: 'Early exit', summary: 'Trust ran out, and Maya left before the real issue came up.',
          text: {
            default: '"Can I go now?" She is out of the door before you can answer.',
            from: {
              // after p. 119, Observe: "You said they'd never listen, and then straight aw..."
              'r2-05:o': 'The almost-laugh goes. She stands. "Can I go now?" She is out of the door before you can answer.',
              // after p. 124, Challenge: "Finding out is a good start. I wonder if it might ..."
              'r2-06a:c': 'She thinks about it a moment longer. Then she stands. "Can I go now?" She is out of the door before you can answer.',
              // after p. 138, Challenge: "You don't have to make a speech. But I don't think..."
              'r2-07:c': 'Then the breath goes out of her. She stands. "Can I go now?" She is out of the door before you can answer.'
            }
          }
        }
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
