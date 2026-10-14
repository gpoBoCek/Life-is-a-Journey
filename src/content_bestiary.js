/* The Bestiary: the mind's monsters as classic fantasy archetypes.
   Each entry keeps the clinical meaning intact; only the wording is themed. */

const BESTIARY = [
  {
    id: 'mimic',
    name: 'MIMIC',
    plain: 'Avoidance',
    lure: 'A task that looks like a chest and bites like a beast. Mostly bluff.',
    feeds: 'Each time you walk past it, you feel relief. That relief is its food. It teaches you that walking past works, so the chest grows, and walking past gets easier every time.',
    fought: 'You do not have to win. Only lift the lid. The dread lives at the threshold and usually shrinks within minutes of starting. Mark the errand as dreaded, then peek: two minutes counts. Before you lift the lid, say how bad you expect it to be; after, say how bad it was. The gap between the two is the bluff of the Mimic, measured.',
    art: 'PEEK',
    note: 'Avoidance is kept alive by the relief it brings (negative reinforcement). Small, scheduled steps toward the avoided thing undo it.'
  },
  {
    id: 'banshee',
    name: 'BANSHEE',
    plain: 'Anxiety and worry',
    lure: 'Her wail announces disaster. She has announced a great many disasters. Very few arrived.',
    feeds: 'She overstates the danger and understates you. If you stay away from what she wails about, you never learn it was smaller than she said, so she keeps her authority. Worry feels like preparing, but it rarely produces a step.',
    fought: 'Walk toward what she wails about, a little at a time, and write down what you expected and what you found. Every gap between the two costs her some authority. Give her one fixed hour a day instead of all of them. In one study of people with generalized anxiety, roughly nine in ten tracked worries did not come true.',
    art: 'PROPHECY, DELVE, SEAL, STEADY',
    note: 'Threat overestimation. Exposure works by testing predictions against reality. Worry postponement limits worry to a set time.'
  },
  {
    id: 'doppelganger',
    name: 'DOPPELGANGER',
    plain: 'Self-criticism and self-hatred',
    lure: 'It wears your face and speaks in your voice, so you take what it says for your own judgement.',
    feeds: 'It casts hexes: brands, iron shoulds, the blind ledger. All eight are listed below. Its attacks bring shame, and shame makes a traveller hide, not try.',
    fought: 'Catch its exact words. Name the hex. Then answer as a companion who has walked beside you for years would answer: not with flattery, but with the accuracy and warmth you would give a friend. If you are too deep in it to answer, catch its words and answer later. Look again a few days on: an answer that holds is worth more than one that only sounds right. Some hexes are prophecies in disguise, and those can be tested against what happens. Travellers who answer themselves kindly try harder after a fall, not less.',
    art: 'DISPEL, and PROPHECY for hexes that predict',
    note: 'Harsh self-criticism and cognitive distortions. Self-compassion, which studies link to more motivation to improve after a failure, not less. Testing a belief against what actually happens (a behavioural experiment) tends to change it more deeply than answering it on paper.'
  },
  {
    id: 'wraith',
    name: 'WRAITH',
    plain: 'Depression',
    lure: 'The old dungeons warned of it: a cold shade whose touch drains levels you earned. You feel weaker than you were, and you are not imagining it. It took something.',
    feeds: 'It grows in dark, empty rooms. The less you do, the fewer small rewards reach you. The fewer rewards, the heavier everything feels. The heavier it feels, the less you do. Every turn of that circle feeds it.',
    fought: 'Light small fires before you feel like it. Motivation follows action more often than it leads it. Choose the next day\'s few small things in advance, so the choosing is not left to the Wraith\'s hour. The levels come back.',
    art: 'TOMORROW\'S ROAD at camp, SUPPRESS (a short burst), and the least version of each ritual',
    note: 'Behavioural activation. Withdrawal removes the rewards that lift mood, which deepens low mood. Scheduling small, rewarding or meaningful activities reverses the cycle.'
  },
  {
    id: 'basilisk',
    name: 'BASILISK',
    plain: 'Helplessness',
    lure: 'Its gaze turns travellers to stone. They stand where it found them, certain they cannot move.',
    feeds: 'The old scholars thought the stone was learned from defeat. Fifty years later, the same scholars found the reverse: after a long ordeal, stillness is the default, and what has to be learned is that action works. The stone is not a sentence. It is what happens before proof arrives.',
    fought: 'Gather proof that what you do changes things: small, many, written down. Each recorded change cracks the stone a little. This is what the Road and its charts are for.',
    art: 'THE ROAD',
    note: 'Learned helplessness, revised (Maier and Seligman, 2016). Passivity is the default response to long, uncontrollable stress; a sense of control is learned through experiences of control.'
  },
  {
    id: 'hydra',
    name: 'HYDRA',
    plain: 'Rumination',
    lure: 'Every head is a question. Why am I like this. Why did that happen. What if. Cut one off and two grow back.',
    feeds: 'Fighting the heads is how it grows. Going over and over a problem feels like solving it, but it rarely reaches a step, and every pass deepens the low mood it came from.',
    fought: 'Do not duel it. Notice that you are circling, then ask one question: is there a step I can take? If yes, write it down as an errand. If not now, seal it until lantern hour. Then leave the fight and turn to something that needs your hands or your attention.',
    art: 'SEAL, SUPPRESS (stillness), or a new errand',
    note: 'Rumination is repetitive, passive dwelling on distress and its causes. It maintains depression and anxiety, and is countered by shifting to concrete, action-focused thinking and absorbing activity.'
  },
  {
    id: 'siren',
    name: 'SIREN',
    plain: 'Escape and distraction',
    lure: 'Her song is sweet and has no end. One more video, one more page, one more hour. Ships that follow it do not sink at once. They drift.',
    feeds: 'Each verse brings quick relief from boredom or dread, and quick relief is exactly what trains a habit. The song is always within reach, so the habit is too.',
    fought: 'Do not count on resisting the song mid-verse. Bind yourself to the mast beforehand: the phone in another room, the app logged out, the limit set while you are calm. A calm hour decides what the stormy hour is allowed to do.',
    art: 'SUPPRESS (ride the urge), TOMORROW\'S ROAD, and a ritual tied to a cue',
    note: 'Precommitment and cue control. Changing your surroundings in advance is more reliable than willpower in the moment.'
  }
];

const FIELD_NOTES = [
  {
    id: 'mount',
    name: 'THE MOUNT',
    plain: 'Sleep, food and movement',
    body: [
      'Not a monster. The horse you ride the whole road on.',
      'A starved, sleepless mount makes every monster stronger. Before you blame the traveller, check the mount: has it slept, eaten a real meal, moved, seen daylight?',
      'Regular sleep and waking times, real meals and some movement each day are not separate quests. They are what every other quest stands on.',
      'The steps and weight you record at camp are the mount\'s own ledger. On the Road you can see how far it has carried you, week by week.'
    ],
    note: 'Sleep, diet and physical activity have well-documented effects on mood and anxiety. Regular exercise has evidence as a treatment for depression.'
  },
  {
    id: 'hexes',
    name: 'THE EIGHT HEXES',
    plain: 'Thinking errors',
    body: [
      'The Doppelganger speaks in eight hexes. Naming the hex is the first half of breaking it.'
    ],
    note: 'These are the classic cognitive distortions from cognitive behavioural therapy.'
  }
];

const HEXES = [
  { id: 'all', name: 'ALL OR NOTHING', says: 'If it is not perfect, it is worthless.', plain: 'All-or-nothing thinking' },
  { id: 'fortune', name: 'THE FORTUNE-TELLER', says: 'It will go badly.', plain: 'Catastrophizing', test: true },
  { id: 'mind', name: 'THE MIND-READER', says: 'They think I am pathetic.', plain: 'Mind reading', test: true },
  { id: 'brand', name: 'THE BRAND', says: 'I am a failure.', plain: 'Labelling' },
  { id: 'ledger', name: 'THE BLIND LEDGER', says: 'That win does not count.', plain: 'Discounting the positive' },
  { id: 'should', name: 'THE IRON SHOULD', says: 'I should be further along by now.', plain: 'Should statements' },
  { id: 'storm', name: 'STORM AS PROOF', says: 'I feel worthless, so I am.', plain: 'Emotional reasoning' },
  { id: 'shadow', name: 'THE LONG SHADOW', says: 'This always happens. It will never change.', plain: 'Overgeneralization', test: true }
];

const DARK_PAGE = {
  title: 'WHEN THE ROAD GOES DARK',
  intro: 'This page is plain on purpose.',
  lines: [
    'If you are thinking about ending your life or harming yourself, or you feel you might not be safe, reach out now.'
  ],
  contacts: [
    { label: 'Emergency services in Cyprus and the EU', number: '112' },
    { label: 'Cyprus Samaritans, emotional support', number: '8000 7773' }
  ],
  more: [
    'Outside Cyprus, findahelpline.com lists free support lines by country.',
    'Tell one person you trust what is going on, today.',
    'If you have a plan or the means close by, put distance between you and them, and go where there are other people.',
    'You do not have to be at the worst moment to call. Calling early is allowed.'
  ]
};
