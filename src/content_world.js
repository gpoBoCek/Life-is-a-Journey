/* The world: terrains, hand-written regions, landmarks, and generator parts. */

const TERRAINS = {
  forest: { label: 'FOREST', art: String.raw`
   ^     ^^     ^    ^^
  ^^^   ^^^^   ^^^  ^^^^
 ^^^^^  ^||^  ^^^^^  ||
   ||    ||     ||   ||
` },
  birch: { label: 'BIRCHWOOD', art: String.raw`
  |  !   |   !  |   !   |
  |  |   !   |  !   |   |
  !  |   |   |  |   !   |
 ,|,,|,,,|,,,!,,|,,,|,,,|,
` },
  marsh: { label: 'MARSH', art: String.raw`
       ,   ,       ,
  ~  ,|, ~  ~ ,|,  ~   ~
 ~ ~  |  ~ ~ ~ | ~ ~  ~ ~
~~~~~~~~~~~~~~~~~~~~~~~~~~
` },
  lake: { label: 'LAKE', art: String.raw`
      _..------.._
  .-''            ''-.
 (    ~     ~    ~    )
  '-..____~_____..-''
` },
  coast: { label: 'COAST', art: String.raw`
     ~       ~          ___
  ~      ~      ~    __/   \__
~~~~~~~~~~~~~~~~~~~~/ .  .   .\
~~~~~~~~~~~~~~~~~~~/_.__.__.__.\
` },
  cliffs: { label: 'CLIFFS', art: String.raw`
 ____
|    |__
|       |___     ~   ~
|           |  ~  ~~  ~ ~
|           |~~~~~~~~~~~~~~
` },
  grass: { label: 'GRASSLAND', art: String.raw`
   ,  ,   ,    ,   ,   ,
 ,,|,,|,,,|,,,,|,,,|,,,|,,
 '''''''''''''''''''''''''
` },
  hills: { label: 'HILLS', art: String.raw`
            ___
     ___   /   \     ___
 ___/   \_/     \___/   \__
/                          \
` },
  mountain: { label: 'MOUNTAINS', art: String.raw`
         /\
    /\  /  \    /\
   /  \/ /\ \  /  \
  /   / /  \ \/    \
` },
  salt: { label: 'SALT FLATS', art: String.raw`
          (   )
 __________________________
    .       .         .
 ______   .      .   ______
` },
  snow: { label: 'SNOWFIELDS', art: String.raw`
   *      .     *     .
      *      *     .     *
  .  /\  *     /\    *
 ___/  \______/  \________
` },
  ruins: { label: 'RUINS', art: String.raw`
   _   _        _
  | |_| |  _   | |   _
  |  _  | | |  | |  | |
 _|_| |_|_|_|__|_|__|_|_
` },
  village: { label: 'SETTLEMENT', art: String.raw`
    __      __       ~
   /  \    /  \     ~
  /____\  /____\  [====]
  | [] |  | [] |  | ][ |
` },
  river: { label: 'RIVER', art: String.raw`
  ,      ,       ,     ,
 ~~~~~~~~~~~~~~~~~~~~~~~~~
  ~~~~~~~~~~~~~~~~~~~~~~~~
 ,     ,      ,      ,
` },
  orchard: { label: 'ORCHARD', art: String.raw`
   &&&      &&&      &&&
  &&o&&    &o&&&    &&&o&
   &&&      &&&      &&&
    |        |        |
` }
};

const FIRST_REGION = ['THE ASH GATE', 'ruins', 'Where every road in this chronicle begins. The gate stands open. It always did.'];

// [name, terrain, line on arrival]
const REGIONS = [
  ['The Salt Flats', 'salt', 'White to the horizon. Your footprints are the only writing here.'],
  ['Hollowmere', 'lake', 'Water so still that birds try to land on their reflections.'],
  ['The Lantern Steppe', 'grass', 'At night, small lights drift just out of reach when approached.'],
  ['The Drowned Bells', 'marsh', 'A sunken village. On calm days the bells still ring under the water.'],
  ['Greyhallow', 'hills', 'Ash-coloured hills where it is always the hour before rain.'],
  ['The Orchards of Aun', 'orchard', 'Trees that fruit in winter. No one remembers planting them.'],
  ['The Moth Archives', 'ruins', 'A library left to the moths, who seem to be reading.'],
  ['Edrin\'s Rest', 'village', 'A ruined inn where every traveller carves one word into the beam.'],
  ['The Birchwood Marches', 'birch', 'White trunks in every direction, like a crowd standing very still.'],
  ['Coldwater Pass', 'mountain', 'The stream up here is so cold it rings against the stones.'],
  ['The Long Shelf', 'cliffs', 'A road cut into the cliff above the sea by someone patient.'],
  ['Wrenholt', 'forest', 'A small wood full of wrens, all of them with opinions.'],
  ['The Quiet Ford', 'river', 'A wide, shallow river crossing where everyone lowers their voice.'],
  ['Mirefen', 'marsh', 'Reeds taller than a rider. Herons watch the road with professional interest.'],
  ['The Amber Downs', 'grass', 'Long grass the colour of honey, combed flat by the wind.'],
  ['Saltcombe', 'coast', 'A fishing hamlet where the nets are mended by moonlight.'],
  ['The Weeping Birches', 'birch', 'Their branches hang to the ground. Walking through them is like parting curtains.'],
  ['Thornhollow', 'forest', 'Bramble arches over the road. Somebody keeps it trimmed to exactly a traveller\'s height.'],
  ['The Pale Tarn', 'lake', 'A mountain lake so clear you can count the stones at the bottom.'],
  ['Kettle Hill', 'hills', 'A round hill that steams on cold mornings, as if something below is cooking.'],
  ['The Sleeping Crags', 'mountain', 'Peaks shaped like giants lying on their backs. Their noses are popular with eagles.'],
  ['Bellwick', 'village', 'A market town that rings a bell for every traveller who arrives. Today it rang for you.'],
  ['The Glass Shore', 'coast', 'Sand fused into green glass by some old fire. It sings under your boots.'],
  ['Ravenscar', 'cliffs', 'Black cliffs where ravens keep careful accounts of passing travellers.'],
  ['The Whitefrost Reach', 'snow', 'Snow so even it looks unwritten.'],
  ['Larkrise', 'grass', 'Larks go up from the grass ahead of you, one after another, like thoughts.'],
  ['The Old Mill Run', 'river', 'A millrace with no mill. The wheel still turns, for no one.'],
  ['Pellmoor', 'marsh', 'Peat smoke and curlews. Paths of laid planks, older than the maps.'],
  ['The Stair of Kings', 'ruins', 'A great staircase leading up the hillside to nothing at all.'],
  ['Fernshade', 'forest', 'Ferns to the waist and a green light like being underwater.'],
  ['The Hundred Wells', 'salt', 'A dry plain dotted with wells. Ninety-nine of them are dry.'],
  ['Brightwater', 'lake', 'A lake that catches the sunrise and holds it longer than it should.'],
  ['Elder Hollow', 'orchard', 'An abandoned orchard of elderflower. The air tastes like cordial.'],
  ['The Hermit\'s Downs', 'hills', 'Rolling hills with one small chimney smoking somewhere you can never quite find.'],
  ['Stonebridge', 'village', 'A town built on a bridge so wide that some people never learn there is a river.'],
  ['The Windward Spine', 'mountain', 'A ridge path with the whole world dropping away on both sides.'],
  ['Gullhaven', 'coast', 'A harbour run, in practice, by gulls.'],
  ['The Sunken Road', 'ruins', 'An old road worn so deep by travel that the trees meet over it.'],
  ['Mossbank', 'river', 'A slow brown river with banks so soft you could sleep on them. People do.'],
  ['The Frostlands', 'snow', 'Wind-carved drifts like frozen waves. The silence has weight.'],
  ['Hesperin\'s Grove', 'orchard', 'Pear trees in perfect rows, planted by a man who counted everything.'],
  ['The Little Wild', 'forest', 'A forest small enough to cross in an afternoon and old enough to forget you did.'],
  ['Gallow Heath', 'grass', 'Purple heather and a wind that never quite stops.'],
  ['The Mirror Marsh', 'marsh', 'Pools so flat that the sky is doubled. It is hard to tell which way is up.'],
  ['Lornscar', 'cliffs', 'Chalk cliffs streaked with gull nests. The sea below is the green of old glass.'],
  ['Nor\'s Crossing', 'village', 'A ferry town where the ferryman has been the same old woman for sixty years.'],
  ['The Bleached Pans', 'salt', 'Cracked white ground that glares at noon. Lizards keep to the shade of your shadow.'],
  ['Tarnwatch', 'lake', 'A watchtower over a small lake, guarding it from no one in particular.'],
  ['The Bracken Fells', 'hills', 'Russet bracken over every hill, crackling like a fire that will not start.'],
  ['The Teeth', 'mountain', 'A row of sharp peaks that look much closer than they are.'],
  ['Wynnlea', 'grass', 'A meadow of wildflowers so loud with bees it hums.'],
  ['The Shipwreck Coast', 'coast', 'Ribs of old ships stand in the sand like the bones of patient animals.'],
  ['Selhaven Ruins', 'ruins', 'A walled town with every door still on its hinges and no one behind them.'],
  ['The Lowmoss', 'marsh', 'Soft ground that sighs when you step on it.'],
  ['Orrin\'s Bend', 'river', 'The river loops back on itself here, as if it forgot something.'],
  ['The Silver Birches', 'birch', 'Bark that catches the moon. At night the wood seems lit from inside.'],
  ['The Quiet Snows', 'snow', 'A high plateau where even the wind seems to whisper.'],
  ['Ashfold', 'village', 'A charcoal burners\' village. Everyone has black hands and very clean windows.'],
  ['The Blackwood', 'forest', 'Pines so dense that noon feels like evening. The road is lit by fungus.'],
  ['The Plum Terraces', 'orchard', 'Plum trees stepped up a hillside, each terrace a little warmer than the last.'],
  ['Highmoor', 'hills', 'A high, bare moor where the sky takes up most of the view.'],
  ['The Calderas', 'mountain', 'Old volcanic craters filled with still blue water.'],
  ['Selkie Cove', 'coast', 'Seals bask on the rocks and watch you the way cats do.'],
  ['The Glare', 'salt', 'A salt lake dried to a mirror. The horizon wobbles in the heat.'],
  ['Wyrmwater', 'lake', 'A long, narrow lake that locals swear is shaped like something sleeping.'],
  ['The Fallen Bridge', 'ruins', 'A great stone bridge that collapsed long ago. The river has made a new road through its arches.'],
  ['Kelby', 'village', 'A sheep town. The sheep are better informed than the people.'],
  ['The Lark Fields', 'grass', 'Rippling barley and a single scarecrow who has clearly given up.'],
  ['Cael Water', 'river', 'A fast clear river full of trout that pretend not to see you.'],
  ['The Fern Fen', 'marsh', 'Green and gold, and full of frogs that sing in rounds.'],
  ['Eldmere', 'lake', 'A lake with an island, and on the island a single tree, and in the tree a single bird.'],
  ['The Cloudbreak', 'mountain', 'A pass high enough that the clouds go around you.'],
  ['The White Wood', 'birch', 'A birch forest after snow, white on white, with blue shadows.'],
  ['The Gull Stacks', 'cliffs', 'Sea stacks standing off the cliffs like stubborn guests who will not leave.'],
  ['Oldstones', 'ruins', 'A ring of standing stones. Each one is a slightly different temperature.'],
  ['Tamsby', 'village', 'A village of bakers. You smell it a league before you see it.'],
  ['The Rolling Barrows', 'hills', 'Grassy mounds of old kings. Rabbits have the run of them now.'],
  ['The Iron Snows', 'snow', 'Grey snow over dark rock, and a sky the colour of a sword.'],
  ['Veymouth', 'coast', 'A river mouth where fresh water meets salt and neither wins.'],
  ['The Apple Lanes', 'orchard', 'Lanes lined with apple trees. You are allowed one apple per tree, by old custom.'],
  ['Durrow Wood', 'forest', 'Oaks so old they have stopped growing up and started growing out.'],
  ['The Saltwind Plain', 'salt', 'A flat waste where the wind carries salt and leaves it on your lips.'],
  ['The Long Water', 'river', 'A river so wide and slow it feels like a lake that decided to travel.'],
  ['Brackmoss', 'marsh', 'Brown water, white cotton grass, and a single lit window somewhere far off.'],
  ['The Sunlit Steppe', 'grass', 'Grass to the horizon. Hawks hang in the air like they were nailed there.'],
  ['Hesting Tarn', 'lake', 'A small dark tarn where the stars show even at dusk.'],
  ['Morwen Heights', 'mountain', 'Steep and kind, with a hut every few miles and firewood stacked by strangers.'],
  ['The Chalk Downs', 'hills', 'White paths over green hills, like someone drew the way for you.'],
  ['The Lost Abbey', 'ruins', 'A roofless abbey where swifts nest in the arches and the bells were carried off long ago.'],
  ['Ulmford', 'village', 'A river town where every house has a boat tied to the back door.'],
  ['The Glimmer Coast', 'coast', 'At night the waves glow blue where they break.'],
  ['The Snowbound Forest', 'snow', 'Pines bowed under the snow, like monks at prayer.'],
  ['The Birch Lanes', 'birch', 'Birches planted along the road by some forgotten lord who liked things tidy.'],
  ['Fennick\'s Orchard', 'orchard', 'An orchard of quinces tended by a man who talks to each tree by name.'],
  ['Highcliff', 'cliffs', 'Cliffs so high you can see the curve of the sea.'],
  ['The Rushes', 'river', 'Bulrushes and kingfishers, and a ferry made of three barrels and a door.'],
  ['The Green Reach', 'forest', 'Beeches in their first leaf. Everything is a shade of green you forgot existed.'],
  ['The Whispering Pans', 'salt', 'The crust cracks in the cold of night with small sounds, like someone turning pages.'],
  ['Stillwater', 'lake', 'A lake where the boats do not drift, even untied.'],
  ['The Thistle Downs', 'grass', 'Thistledown floats over the road like slow snow.'],
  ['The Hollow Hills', 'hills', 'Hills with doors in them. None of the doors have handles on the outside.'],
  ['Gallowmere', 'marsh', 'A misty marsh crossed by a causeway of white stones.'],
  ['The Rimewall', 'mountain', 'A wall of ice-glazed rock with a single path switching back and forth up its face.'],
  ['Wickham Market', 'village', 'A crossroads market that sells everything, including things no one asked for.'],
  ['The Painted Ruins', 'ruins', 'Fallen walls still bright with old murals of feasts and boats.'],
  ['Pearlbay', 'coast', 'A bay of oyster beds and old women who know which shells hold pearls.'],
  ['The Far Snows', 'snow', 'The last place on the map before the map gives up.'],
  ['Sorrel Bank', 'river', 'A riverbank of wild sorrel and a rope swing nobody admits to using.'],
  ['The Hazel Wood', 'forest', 'Hazel thickets full of nuts and the squirrels who consider them theirs.'],
  ['The Cherry Steps', 'orchard', 'Cherry trees on a stair of terraces. In spring the steps are pink with petals.'],
  ['Skyrest', 'cliffs', 'A grassy headland where people come to lie on their backs and watch the clouds.'],
  ['Rookery Fen', 'marsh', 'A marsh of alders full of rooks who argue all evening.'],
  ['The Bright Plain', 'grass', 'A wide plain of daisies. Even the road is white with them.'],
  ['Ironmere', 'lake', 'A deep lake the colour of slate, where the old mines flooded.'],
  ['The Last Lighthouse', 'coast', 'A lighthouse at the end of a long spit of sand. The keeper waves.'],
  ['Wren\'s Crossing', 'village', 'A hamlet at a crossroads, with a well, a bench, and a dog who greets everyone.'],
  ['The Bone-White Birches', 'birch', 'Old birches peeling like parchment. People write wishes on the loose bark.'],
  ['The Glacier Stair', 'snow', 'A frozen river of ice coming down from the peaks, groaning in its sleep.'],
  ['The Broken Crown', 'ruins', 'The ruin of a castle whose towers lean together like gossips.'],
  ['The Rainbarrow', 'hills', 'A single hill where rain falls more often than anywhere else. Everything is very green.']
];

// Landmarks: shown as their own lines, by terrain, plus generic ones anywhere.
const LANDMARKS = {
  forest: [
    'A shrine to a forgotten goddess of lost keys. Someone has left a key on it.',
    'A woodcutter\'s hut, empty, with the kettle still warm.',
    'An oak with a door carved in its trunk. You do not knock.',
    'A clearing where the light falls in a perfect circle.',
    'A signpost so overgrown that only one word shows: ONWARD.',
    'A fallen tree that someone has turned into a long bench.'
  ],
  birch: [
    'A birch with a name carved into it, and a date older than the road.',
    'A ring of birches around a still pool.',
    'A hollow birch with a candle stub inside, still faintly warm.',
    'A rope swing on the one birch strong enough to hold it.',
    'A family of deer who let you pass without looking up.',
    'A bundle of white bark, tied with string, left for whoever needs kindling.'
  ],
  marsh: [
    'A heron standing on one leg, as it has been since morning.',
    'A plank bridge with a bell at either end.',
    'A lantern on a pole, lit, with no one tending it.',
    'A boat moored in the reeds with a note: BORROW, BUT RETURN.',
    'A will-o\'-the-wisp that keeps a polite distance.',
    'An island of firm ground with a single bench and a view of nothing but sky.'
  ],
  lake: [
    'A jetty that ends in the middle of the water.',
    'A boathouse with an old rowing boat, oars shipped.',
    'A flat stone, perfect for skipping. You skip it.',
    'A fisherman who has caught nothing all day and is perfectly content.',
    'A swan that escorts you along the shore for a while.',
    'An island chapel you can reach only when the water is low.'
  ],
  coast: [
    'A bottle on the sand with a letter inside. It is addressed to someone else.',
    'A rock pool with a crab that will not let go of a button.',
    'A lighthouse keeper\'s washing line, flapping in the salt wind.',
    'An upturned boat that someone uses as a roof.',
    'A cave that echoes the sea back a moment too late.',
    'A row of driftwood seats facing the sunset.'
  ],
  cliffs: [
    'A bench bolted to the very edge of the cliff.',
    'A stair cut into the rock, down to a beach no one uses.',
    'A puffin colony, deeply unimpressed with you.',
    'A cairn at the highest point. You add a stone.',
    'An old signal fire, laid and ready, never lit.',
    'A crack in the cliff where the wind plays a single note.'
  ],
  grass: [
    'A lone tree in the middle of the plain, with a well-worn path to its shade.',
    'A scarecrow wearing a better coat than yours.',
    'A herd of wild horses that run alongside the road and then lose interest.',
    'A milestone with every number worn away.',
    'A shepherd\'s hut on wheels, with a dog asleep on the step.',
    'A circle of flattened grass where something large slept last night.'
  ],
  hills: [
    'A stone hut on the hilltop with a visitors\' book. You sign it.',
    'A spring that comes out of the hillside into a stone basin.',
    'A white horse cut into the chalk, older than anyone remembers.',
    'A barrow with an open door and a smell of old bread.',
    'A gate in a wall that runs over the hill and has no other gates.',
    'A flock of sheep arranged in a way that seems deliberate.'
  ],
  mountain: [
    'A mountain hut with dry socks hanging by the stove for whoever needs them.',
    'A frozen waterfall, mid-fall.',
    'A prayer flag line, faded to pale colours.',
    'An eagle\'s nest you can see into from the path.',
    'A small bridge of a single stone slab over a deep gorge.',
    'A mountain goat that blocks the path until you say good morning.'
  ],
  salt: [
    'A dry well with a bucket and a rope that reaches nothing.',
    'A salt cairn, glittering, built by caravans for luck.',
    'The skeleton of a cart, polished white by the wind.',
    'A mirage of a city that stays exactly the same distance away.',
    'A tent left pitched and stocked with water, for whoever comes next.',
    'A lizard who has claimed your shadow as its own.'
  ],
  snow: [
    'A snowman with a scarf, built by someone who did not stay to see it finished.',
    'A hot spring steaming in the snow.',
    'A sledge track that ends at nothing.',
    'A shelter of stacked ice blocks, warm inside.',
    'A frozen lake where the fish are visible under the ice, waiting for spring.',
    'An arctic fox that follows you for a league, out of curiosity.'
  ],
  ruins: [
    'A throne, open to the sky, with moss for a cushion.',
    'A broken statue of a hero whose name has worn off.',
    'A courtyard fountain that still runs.',
    'A library shelf with one book left on it, unreadable.',
    'A bell tower with no bell, and a rope that still hangs.',
    'A mosaic floor of a ship at sea, missing only the sail.'
  ],
  village: [
    'A bakery with a window full of loaves shaped like animals.',
    'A notice board covered in lost and found. Mostly found.',
    'A tavern called The Last Stop, though the road clearly goes on.',
    'A well with a bucket and a cup chained to it.',
    'A blacksmith who nods at you as if you have met before.',
    'A market stall selling small brass bells, for luck on the road.'
  ],
  river: [
    'A ferry rope strung across the river, and a raft tied to it.',
    'A water mill, its wheel turning slowly.',
    'Stepping stones, one of them slightly wobbly.',
    'A kingfisher, there and gone.',
    'A boat full of geese, with no one rowing.',
    'An old stone bridge with a carving of a fish on the keystone.'
  ],
  orchard: [
    'A ladder left against a tree, and a basket half full.',
    'A beehive painted with flowers.',
    'A cider press, sticky and fragrant.',
    'A tree tied with ribbons, one for every year the orchard has been tended.',
    'A windfall of apples nobody has gathered. You take one.',
    'A scarecrow made of old hats, guarding nothing in particular.'
  ],
  any: [
    'A milestone that says only: FURTHER THAN YESTERDAY.',
    'A bench with a brass plate: FOR WHOEVER NEEDS IT.',
    'A wayside shrine with fresh flowers. Someone passed recently.',
    'A traveller going the other way, who wishes you a good road.',
    'A crossroads with four signposts, all pointing the way you are going.',
    'A stone with a hollow full of rainwater, exactly enough for one drink.',
    'An abandoned cart full of books. You take one and leave one.',
    'A little free pantry on a post: TAKE WHAT YOU NEED.',
    'An old campfire ring with a neat stack of dry wood beside it.',
    'A hare who stops in the road, considers you, and moves on.',
    'A rope bridge, newly mended.',
    'A tin box nailed to a post, with pencil and paper, for leaving messages.',
    'A stone circle no bigger than a dinner table.',
    'A wishing well, mostly full of buttons.',
    'A pilgrim\'s staff leaning on a wall, waiting for its next pilgrim.',
    'A field of standing stones painted with handprints.',
    'A tiny chapel with room for one person and one candle.',
    'A signpost to a town that is no longer there.',
    'A pair of boots left neatly by the road, as if the owner had walked on barefoot.',
    'A cat sitting on a wall, guarding the road with great seriousness.',
    'A stone bench carved with the words: REST IS NOT FAILURE.',
    'A tree full of small bells that ring in the wind.',
    'A cairn for travellers. You add your stone.',
    'A kite stuck in a tree, waiting for a strong enough wind.',
    'A drinking fountain shaped like a lion with a cracked smile.',
    'A post with a lantern on it, and a box of matches, and a note: FOR THE DARK.',
    'A sundial that is exactly one hour wrong.',
    'An old map nailed to a gate, with a small X: YOU ARE HERE.',
    'A garden gnome far from any garden.',
    'A bridge with a troll\'s toll box, empty for a hundred years.',
    'A mossy statue of a traveller, mid-step, facing the same way as you.',
    'A hollow log full of dry leaves where something small is sleeping.',
    'A row of ribbons tied on a fence by people who passed this way.',
    'A spring with a tin ladle and a sign: SWEETEST WATER ON THE ROAD.',
    'A shepherd\'s whistle hanging from a nail.',
    'A stone with your initial carved on it, by someone with the same initial.',
    'A puddle with a whole sky in it.',
    'A bird feeder, freshly filled, nowhere near a house.',
    'A milestone half buried, which you dig out and set straight.',
    'A ruined wall with a window that frames the view perfectly.'
  ]
};

// Generator parts for regions beyond the hand-written list.
const REGIONGEN = {
  roots: ['Ash', 'Thorn', 'Wren', 'Elder', 'Hollow', 'Brack', 'Fern', 'Grey', 'Stone', 'Cold', 'Moth', 'Bell',
    'Raven', 'Lark', 'Mor', 'Ael', 'Bryn', 'Cael', 'Eld', 'Gal', 'Hes', 'Kel', 'Lor', 'Nor', 'Orr', 'Pell',
    'Quen', 'Ros', 'Sel', 'Tor', 'Vey', 'Wyn', 'Yr', 'Dun', 'Har', 'Ise', 'Ulm', 'Tam', 'Vel', 'Oss',
    'Rook', 'Heron', 'Fox', 'Bram', 'Wil', 'Ember', 'Frost', 'Gold', 'Silver', 'Black', 'White', 'Red',
    'Hazel', 'Oak', 'Rowan', 'Alder', 'Thistle', 'Sorrel', 'Rush', 'Wold'],
  adjectives: ['Weeping', 'Silent', 'Grey', 'Long', 'Lantern', 'Hollow', 'Amber', 'Drowned', 'Whispering',
    'Sleeping', 'Broken', 'Lesser', 'High', 'Low', 'Pale', 'Sunken', 'Wandering', 'Patient', 'Bright',
    'Quiet', 'Ashen', 'Golden', 'Far', 'Thistle', 'Rook', 'Lark', 'Kindly', 'Old', 'Hidden', 'Green',
    'Singing', 'Shining', 'Still', 'Windy', 'Misty', 'Copper', 'Ivory', 'Velvet', 'Restless', 'Forgotten'],
  suffixes: {
    forest: ['wood', 'weald', 'holt', 'shade', 'thicket', 'greenwood'],
    birch: ['birches', 'birchwood', 'whitewood'],
    marsh: ['mere', 'fen', 'moss', 'marsh', 'mire', 'reach'],
    lake: ['mere', 'water', 'tarn', 'lough', 'pool'],
    coast: ['strand', 'shore', 'sands', 'bay', 'haven', 'cove'],
    cliffs: ['head', 'cliffs', 'ness', 'edge', 'scar'],
    grass: ['steppe', 'meadows', 'plain', 'lea', 'downs'],
    hills: ['hills', 'fells', 'knolls', 'rise', 'barrows'],
    mountain: ['peaks', 'pass', 'crags', 'heights', 'spine'],
    salt: ['flats', 'pans', 'waste', 'glare', 'barrens'],
    snow: ['snows', 'white', 'frostlands', 'drifts', 'tundra'],
    ruins: ['ruin', 'halls', 'stones', 'keep', 'spires'],
    village: ['ford', 'stead', 'by', 'wick', 'ton', 'rest'],
    river: ['ford', 'run', 'bend', 'reach', 'water'],
    orchard: ['orchards', 'groves', 'gardens', 'yards']
  },
  openers: {
    forest: ['Old trees close over the road like a roof.', 'The wood is quiet in the way a held breath is quiet.', 'Moss on every stone, and on most of the trees.', 'Pine needles muffle every step.', 'Sunlight comes down in slanting columns.', 'The path twists between trunks as if it is avoiding someone.'],
    birch: ['Pale trunks, black-marked, stretch away on every side.', 'The leaves flicker silver in the slightest wind.', 'A thin wood full of light.', 'The birches creak softly to one another.', 'Peeling bark curls like old letters.', 'The ground is gold with fallen leaves.'],
    marsh: ['Reeds and water and a sky that seems too big.', 'The ground gives a little under every step.', 'Frogs fall silent as you pass, then start again behind you.', 'Mist lies low over the pools.', 'Causeway stones lead on through the wet.', 'Curlews call across the flats.'],
    lake: ['The water is still enough to mirror the clouds.', 'Small waves lap at a pebble shore.', 'A cold wind comes off the water.', 'Reeds rattle at the lake edge.', 'The far shore is blue with distance.', 'Mist rises off the water in the early hours.'],
    coast: ['Salt on the wind and gulls overhead.', 'The tide is out, and the sand runs flat to the sea.', 'Waves break in long white lines.', 'The road follows the shore around a wide bay.', 'Seaweed and driftwood mark the high tide.', 'Every few minutes a bigger wave comes in, as if to check on you.'],
    cliffs: ['The path keeps close to a long drop to the sea.', 'Wind pushes hard at the edge.', 'Seabirds wheel below you, which is strange.', 'The cliffs are banded in red and grey.', 'Far below, the sea grinds at the rocks.', 'Thrift and sea campion grow in every crack.'],
    grass: ['Grass runs to every horizon.', 'The wind moves over the grass in long waves.', 'There is nothing taller than you for miles.', 'Wildflowers grow along the road.', 'The sky is very large here.', 'Crickets keep up a steady noise in the grass.'],
    hills: ['The road rises and falls like a slow breath.', 'Stone walls run over the hills and out of sight.', 'Sheep dot the slopes.', 'From each hilltop you can see the next.', 'A cool wind blows across the tops.', 'Streams run down every fold of the hills.'],
    mountain: ['The air is thin and very clear.', 'Snow lies in the gullies even now.', 'The path switches back and forth up the slope.', 'Rock and sky, and very little else.', 'Clouds pour over the ridge like slow water.', 'Your breath shows in the cold air.'],
    salt: ['White ground cracks into tiles underfoot.', 'The light is hard and bright.', 'Heat shimmers on the horizon.', 'Nothing grows here, and nothing seems to mind.', 'The crust crunches like frost.', 'The flatness is almost restful.'],
    snow: ['Snow covers everything in a smooth white sheet.', 'Your boots squeak in the cold snow.', 'Ice glitters on every branch.', 'The cold is clean and sharp.', 'Drifts curve like dunes.', 'The quiet is deep enough to hear your own heartbeat.'],
    ruins: ['Broken walls rise out of the grass.', 'Old stones lie where they fell, long ago.', 'Ivy holds the ruins together.', 'Empty windows look out on nothing.', 'Steps lead up to doorways with no rooms behind them.', 'The ruins are quiet, but not unfriendly.'],
    village: ['Smoke rises from a handful of chimneys.', 'A dog barks once, then wags.', 'Washing hangs between the houses.', 'Someone is baking.', 'Children stop playing to watch you pass.', 'The road becomes a street for a while.'],
    river: ['The road follows the river closely here.', 'Water chatters over stones.', 'Willows lean over the water.', 'The river runs brown and steady.', 'Dragonflies hover over the shallows.', 'A cool breath comes off the water.'],
    orchard: ['Fruit trees stand in tidy rows.', 'The air smells of blossom and bees.', 'Windfalls lie in the grass.', 'Old gnarled trees, still bearing.', 'Ladders lean against a few of the trees.', 'Wasps doze in the fallen fruit.']
  },
  details: ['Someone has left a lantern hanging from a branch, still lit.', 'A crow follows you for a while, then thinks better of it.',
    'The light here makes everything look slightly older.', 'You have the feeling that someone was singing here a moment ago.',
    'An old path branches off and disappears into the distance.', 'Far ahead, a bell rings three times.',
    'Bootprints in the mud go the same way you are going.', 'There are wild herbs growing by the road.',
    'It smells of woodsmoke, though there is no fire in sight.', 'The road is in better repair than you expected.',
    'A breeze picks up, as if to keep you company.', 'Someone has stacked flat stones into small towers along the way.',
    'The clouds move faster here than anywhere else.', 'You hear running water but cannot see it.',
    'A hawk circles high overhead.', 'The road feels older here, as if many have walked it.',
    'Small blue butterflies rise from the verge.', 'A ribbon is tied to a post, faded from red to pink.',
    'The colours are softer here, like an old painting.', 'You pass a ruined wall and a gate that still closes.',
    'Somewhere a dog is barking at nothing in particular.', 'The evening comes slowly here.',
    'It is the kind of place you remember later without knowing why.', 'The road rises gently, enough to notice.',
    'Every so often, the wind smells of the sea.', 'A distant figure waves from a hill and is gone.',
    'You find a smooth stone in your path and pocket it.', 'There is a rumour of a hidden spring nearby.',
    'Old wheel ruts are carved into the rock.', 'An owl calls, even though it is not yet dark.']
};
