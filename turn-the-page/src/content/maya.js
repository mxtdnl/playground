// Turn the Page — case file: Maya, 16.
//
// DATA ONLY. No logic belongs in this file (CLAUDE.md, SPEC.md 14.1).
// You can edit any text between quotes without touching code. After editing,
// run `node build.mjs` from turn-the-page/ and then the tests.
//
// The profile and referral note are the real version 1 content
// (SPEC.md 6.2, 6.3). The two rounds below are a STUB written in session 1
// to exercise the engine: three nodes per round, one per act. Every stub line
// starts with "PLACEHOLDER:". Session 2 replaces the rounds with the full script.
//
// How an option works:
//   id        unique within its node
//   lever     'question' | 'support' | 'observe' | 'challenge'
//   quality   Round 1 only: 'skilful' or 'clumsy'
//   text      what the counsellor says
//   reaction  Maya's reaction; `default`, plus optional variants keyed
//             'trait:band' (for example 'extraversion:low')
//   next      optional: the node this option leads to (null ends the round);
//             if absent, the node's own `next` decides
//   override  optional small hand-tuned adjustment, -5 to +5 per meter
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
      { text: 'She used to participate actively but has gone quiet in class', trait: 'extraversion', note: 'PLACEHOLDER: mapping to be confirmed in session 2' },
      { text: 'she said she\'s "just being lazy."', trait: 'confidence', note: 'PLACEHOLDER: mapping to be confirmed in session 2' },
      { text: 'When I asked, she said', trait: 'defensiveness', note: 'PLACEHOLDER: mapping to be confirmed in session 2' },
      { text: 'has missed two homework deadlines', trait: 'readiness', note: 'PLACEHOLDER: mapping to be confirmed in session 2' }
    ]
  },

  rounds: {
    // ---------------------------------------------------------------------
    // ROUND 1 — "Just lazy". Format B: pick a lever, then one of two wordings.
    r1: {
      title: 'Just lazy',
      format: 'B',
      start: 'r1-01',
      acts: {
        1: { title: 'Opening', cliffhanger: 'PLACEHOLDER: She looked at the door. Then she looked back at you.' },
        2: { title: 'Exploration', cliffhanger: 'PLACEHOLDER: Something in her voice had changed.' },
        3: { title: 'Turning point', cliffhanger: 'PLACEHOLDER: The bell would ring soon.' }
      },
      nodes: {
        'r1-01': {
          page: 7,
          act: 1,
          scene: { pose: { gaze: 'door' } },
          line: 'PLACEHOLDER: Mr Okafor sent me. I know — my grades. I\'m just being lazy.',
          cue: 'PLACEHOLDER: She sits on the edge of the chair, bag still on her shoulder.',
          next: 'r1-02',
          options: [
            { id: 'q-s', lever: 'question', quality: 'skilful', text: 'PLACEHOLDER: What does "lazy" look like for you at the moment?', reaction: { default: 'PLACEHOLDER: She shrugs. "Just... not doing stuff."' }, debrief: 'PLACEHOLDER: Opened the topic in her words; it asked her to explain before she felt safe.' },
            { id: 'q-c', lever: 'question', quality: 'clumsy', text: 'PLACEHOLDER: So why have you stopped doing your homework?', reaction: { default: 'PLACEHOLDER: "I don\'t know." She looks at the floor.' }, debrief: 'PLACEHOLDER: Went straight to the problem; it framed the talk as being about her failure.' },
            { id: 's-s', lever: 'support', quality: 'skilful', text: 'PLACEHOLDER: Thanks for coming in. This isn\'t a telling-off; I\'d just like to hear how things are.', reaction: { default: 'PLACEHOLDER: Her shoulders drop slightly.' }, debrief: 'PLACEHOLDER: Lowered the stakes early; it gave her little to think about yet.' },
            { id: 's-c', lever: 'support', quality: 'clumsy', text: 'PLACEHOLDER: Oh, I\'m sure you\'re not lazy at all!', reaction: { default: 'PLACEHOLDER: "You don\'t know that."' }, debrief: 'PLACEHOLDER: Warm, but it contradicted her before hearing her out.' },
            { id: 'o-s', lever: 'observe', quality: 'skilful', text: 'PLACEHOLDER: You\'ve kept your bag on. You don\'t have to stay long if you\'d rather not.', reaction: { default: 'PLACEHOLDER: She glances down, then slides the bag off.' }, debrief: 'PLACEHOLDER: Named what you saw and gave her a choice; at low trust it can feel watched.' },
            { id: 'o-c', lever: 'observe', quality: 'clumsy', text: 'PLACEHOLDER: You look like you really don\'t want to be here.', reaction: { default: 'PLACEHOLDER: "Well, I didn\'t ask to come."' }, debrief: 'PLACEHOLDER: An honest observation, but it read as a judgement.' },
            { id: 'c-s', lever: 'challenge', quality: 'skilful', text: 'PLACEHOLDER: "Lazy" is one explanation. I wonder if it\'s the whole one.', reaction: { default: 'PLACEHOLDER: She frowns. "What else would it be?"' }, debrief: 'PLACEHOLDER: Questioned her label early; it pushed before there was trust to push against.' },
            { id: 'c-c', lever: 'challenge', quality: 'clumsy', text: 'PLACEHOLDER: Are you, though?', override: { trust: -2 }, reaction: { default: 'PLACEHOLDER: She folds her arms. "Yes."' }, debrief: 'PLACEHOLDER: Direct, and it shut the topic down for now.' }
          ]
        },
        'r1-02': {
          page: 23,
          act: 2,
          scene: { pose: { gaze: 'phone' } },
          line: 'PLACEHOLDER: I just can\'t start anything. It\'s pointless anyway.',
          cue: 'PLACEHOLDER: She checks her phone when the future comes up.',
          next: 'r1-03',
          options: [
            { id: 'q-s', lever: 'question', quality: 'skilful', text: 'PLACEHOLDER: Pointless in what way?', reaction: { default: 'PLACEHOLDER: "Everyone\'s already decided what I\'m doing after school."' }, debrief: 'PLACEHOLDER: Followed her word; it surfaced the first hint of the real issue.' },
            { id: 'q-c', lever: 'question', quality: 'clumsy', text: 'PLACEHOLDER: Don\'t you think your grades matter?', reaction: { default: 'PLACEHOLDER: "Obviously."' }, debrief: 'PLACEHOLDER: A closed question with an answer built in; she gave the expected one.' },
            { id: 's-s', lever: 'support', quality: 'skilful', text: 'PLACEHOLDER: That sounds like a heavy feeling to carry around.', reaction: { default: 'PLACEHOLDER: She nods, barely.' }, debrief: 'PLACEHOLDER: Acknowledged the feeling; it kept the focus on comfort rather than on what is behind it.' },
            { id: 's-c', lever: 'support', quality: 'clumsy', text: 'PLACEHOLDER: Don\'t worry, everyone feels like that sometimes.', reaction: { default: 'PLACEHOLDER: "Right."' }, debrief: 'PLACEHOLDER: Reassuring, but it made her feeling ordinary before she had explained it.' },
            { id: 'o-s', lever: 'observe', quality: 'skilful', text: 'PLACEHOLDER: I noticed you looked at your phone just as we got to "after school".', reaction: { default: 'PLACEHOLDER: She puts the phone face down.' }, debrief: 'PLACEHOLDER: Used a real cue; it worked because it was specific and not a criticism.' },
            { id: 'o-c', lever: 'observe', quality: 'clumsy', text: 'PLACEHOLDER: Could you put the phone away while we talk?', reaction: { default: 'PLACEHOLDER: She does, slowly.' }, debrief: 'PLACEHOLDER: Noticed the phone, but treated it as a rule to enforce rather than a signal.' },
            { id: 'c-s', lever: 'challenge', quality: 'skilful', text: 'PLACEHOLDER: You say it\'s pointless, but you came in and you\'re still talking to me.', reaction: { default: 'PLACEHOLDER: "I had to come."' }, debrief: 'PLACEHOLDER: Offered another view of her; it depends on how much trust there is by now.' },
            { id: 'c-c', lever: 'challenge', quality: 'clumsy', text: 'PLACEHOLDER: It\'s only pointless if you decide it is.', reaction: { default: 'PLACEHOLDER: She rolls her eyes.' }, debrief: 'PLACEHOLDER: A push, but in a slogan she could easily dismiss.' }
          ]
        },
        'r1-03': {
          page: 41,
          act: 3,
          scene: { pose: { gaze: 'counsellor' } },
          line: 'PLACEHOLDER: I don\'t know what I\'d even do differently.',
          cue: 'PLACEHOLDER: She is looking at you now.',
          next: null, // last node: the round ends after this choice
          options: [
            { id: 'q-s', lever: 'question', quality: 'skilful', text: 'PLACEHOLDER: If the next two weeks went a bit better, what would you notice?', reaction: { default: 'PLACEHOLDER: "Maybe... I\'d actually start one thing."' }, debrief: 'PLACEHOLDER: Asked her to picture the change; the step became hers.' },
            { id: 'q-c', lever: 'question', quality: 'clumsy', text: 'PLACEHOLDER: Will you promise to hand in the next piece on time?', reaction: { default: 'PLACEHOLDER: "I guess."' }, debrief: 'PLACEHOLDER: Got a yes; it was your plan, not hers.' },
            { id: 's-s', lever: 'support', quality: 'skilful', text: 'PLACEHOLDER: It\'s fine not to know yet. We can work it out together.', reaction: { default: 'PLACEHOLDER: She relaxes a little.' }, debrief: 'PLACEHOLDER: Kept her comfortable; it left the next step with you.' },
            { id: 's-c', lever: 'support', quality: 'clumsy', text: 'PLACEHOLDER: Don\'t worry, I\'ll sort out a plan for you.', reaction: { default: 'PLACEHOLDER: "OK. Thanks."' }, debrief: 'PLACEHOLDER: Took the weight off her, and the ownership with it.' },
            { id: 'o-s', lever: 'observe', quality: 'skilful', text: 'PLACEHOLDER: You sat up when you talked about starting one thing.', reaction: { default: 'PLACEHOLDER: "Did I?" A small smile.' }, debrief: 'PLACEHOLDER: Reflected her energy back; it let her see her own idea.' },
            { id: 'o-c', lever: 'observe', quality: 'clumsy', text: 'PLACEHOLDER: You obviously know what you need to do.', reaction: { default: 'PLACEHOLDER: "Do I?"' }, debrief: 'PLACEHOLDER: Meant as confidence in her; it read as pressure.' },
            { id: 'c-s', lever: 'challenge', quality: 'skilful', text: 'PLACEHOLDER: I think you might know more than you\'re saying. What\'s one thing?', reaction: { default: 'PLACEHOLDER: She thinks. "Maybe I could do homework before my phone."' }, debrief: 'PLACEHOLDER: Pushed for her own answer; with trust in place it can land.' },
            { id: 'c-c', lever: 'challenge', quality: 'clumsy', text: 'PLACEHOLDER: Saying "I don\'t know" won\'t get your grades back up.', reaction: { default: 'PLACEHOLDER: "Can I go now?"' }, debrief: 'PLACEHOLDER: True, but it arrived as a reprimand.' }
          ]
        }
      },
      endings: {
        breakthrough: { title: 'Breakthrough', text: 'PLACEHOLDER: Maya proposes her own next step.' },
        partial: { title: 'Agreement without ownership', text: 'PLACEHOLDER: Maya agrees to your suggestion.' },
        polite: { title: 'Polite exit', text: 'PLACEHOLDER: Maya thanks you and leaves, unmoved.' },
        early: { title: 'Early exit', text: 'PLACEHOLDER: "Can I go now?"' }
      }
    },

    // ---------------------------------------------------------------------
    // ROUND 2 — "Two weeks later". Format C: four unlabelled lines, then
    // "Name that lever". The opening depends on how Round 1 ended.
    r2: {
      title: 'Two weeks later',
      format: 'C',
      // Opening node by Round 1 ending. The stub uses one opening for all four.
      starts: { breakthrough: 'r2-01', partial: 'r2-01', polite: 'r2-01', early: 'r2-01' },
      acts: {
        1: { title: 'Reconnecting', cliffhanger: 'PLACEHOLDER: She put a brochure on the desk.' },
        2: { title: 'The real issue', cliffhanger: 'PLACEHOLDER: She had never said it out loud before.' },
        3: { title: 'Her next step', cliffhanger: 'PLACEHOLDER: This time, she spoke first.' }
      },
      nodes: {
        'r2-01': {
          page: 52,
          act: 1,
          scene: { pose: { gaze: 'window' } },
          line: 'PLACEHOLDER: So... about what we said last time.',
          cue: 'PLACEHOLDER: She is holding a course brochure.',
          next: 'r2-02',
          options: [
            { id: 'q', lever: 'question', text: 'PLACEHOLDER: How have the last two weeks gone?', reaction: { default: 'PLACEHOLDER: "Some of it went OK."' }, debrief: 'PLACEHOLDER: An open check-in; it let her choose where to start.' },
            { id: 's', lever: 'support', text: 'PLACEHOLDER: It\'s good to see you again.', reaction: { default: 'PLACEHOLDER: She smiles briefly.' }, debrief: 'PLACEHOLDER: Warm reconnection; it postponed the agreed action.' },
            { id: 'o', lever: 'observe', text: 'PLACEHOLDER: You\'ve brought a brochure with you.', reaction: { default: 'PLACEHOLDER: "Oh. It\'s nothing."' }, debrief: 'PLACEHOLDER: Noticed the prop; it may have arrived before she was ready.' },
            { id: 'c', lever: 'challenge', text: 'PLACEHOLDER: Last time you said you\'d start one thing. Did you?', reaction: { default: 'PLACEHOLDER: She looks away.' }, debrief: 'PLACEHOLDER: Held her to her word; it felt like a check-up rather than a check-in.' }
          ]
        },
        'r2-02': {
          page: 68,
          act: 2,
          scene: { pose: { gaze: 'floor' } },
          line: 'PLACEHOLDER: There\'s no point even thinking about design. My parents want medicine.',
          cue: 'PLACEHOLDER: She turns the brochure face down.',
          next: 'r2-03',
          options: [
            { id: 'q', lever: 'question', text: 'PLACEHOLDER: What draws you to design?', reaction: { default: 'PLACEHOLDER: She talks for longer than she has all term.' }, debrief: 'PLACEHOLDER: Explored her interest; it set the family question aside for now.' },
            { id: 's', lever: 'support', text: 'PLACEHOLDER: It makes sense that you\'d want them to be proud of you.', reaction: { default: 'PLACEHOLDER: "I do."' }, debrief: 'PLACEHOLDER: Respected both her and her family; it did not yet move her thinking.' },
            { id: 'o', lever: 'observe', text: 'PLACEHOLDER: You turned the brochure over when you mentioned your parents.', reaction: { default: 'PLACEHOLDER: She turns it back.' }, debrief: 'PLACEHOLDER: Named a real cue; it showed her the conflict she feels.' },
            { id: 'c', lever: 'challenge', text: 'PLACEHOLDER: You\'re sure they\'d never listen. Have you ever asked them?', reaction: { default: 'PLACEHOLDER: "...No."' }, debrief: 'PLACEHOLDER: High risk, high reward: it tested her assumption about her parents.' }
          ]
        },
        'r2-03': {
          page: 84,
          act: 3,
          scene: { pose: { gaze: 'counsellor' } },
          line: 'PLACEHOLDER: I don\'t know how I\'d even bring it up.',
          cue: 'PLACEHOLDER: She leans forward.',
          next: null, // last node
          options: [
            { id: 'q', lever: 'question', text: 'PLACEHOLDER: How would you want that conversation to go?', reaction: { default: 'PLACEHOLDER: "Calmly. Maybe with you there?"' }, debrief: 'PLACEHOLDER: She designed the next step herself.' },
            { id: 's', lever: 'support', text: 'PLACEHOLDER: Whatever you decide, I\'m here to help.', reaction: { default: 'PLACEHOLDER: "Thanks."' }, debrief: 'PLACEHOLDER: Reassured her; the next step stayed vague.' },
            { id: 'o', lever: 'observe', text: 'PLACEHOLDER: You\'ve talked about design with more energy than anything else today.', reaction: { default: 'PLACEHOLDER: "I suppose I have."' }, debrief: 'PLACEHOLDER: Reflected her energy; it left the step for her to name.' },
            { id: 'c', lever: 'challenge', text: 'PLACEHOLDER: What would it cost you to say nothing at all?', reaction: { default: 'PLACEHOLDER: She is quiet for a long time.' }, debrief: 'PLACEHOLDER: Made the cost of waiting visible; it can feel heavy at the end of a session.' }
          ]
        }
      },
      endings: {
        breakthrough: { title: 'Breakthrough', text: 'PLACEHOLDER: Maya proposes her own next step.' },
        partial: { title: 'Agreement without ownership', text: 'PLACEHOLDER: Maya agrees to your suggestion.' },
        polite: { title: 'Polite exit', text: 'PLACEHOLDER: Maya thanks you and leaves, unmoved.' },
        early: { title: 'Early exit', text: 'PLACEHOLDER: "Can I go now?"' }
      }
    }
  },

  // The two biggest turning points per round, highlighted in the debrief.
  turningPoints: { r1: ['r1-02', 'r1-03'], r2: ['r2-02', 'r2-03'] },

  // What another lever tended to do at a turning point (precomputed text).
  roadNotTaken: {
    'r1-02': { observe: 'PLACEHOLDER: Noticing the phone tended to open the future topic.' },
    'r2-02': { challenge: 'PLACEHOLDER: Questioning her assumption tended to open or close the conversation.' }
  }
};
