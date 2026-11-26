# Quality report

This file has twelve parts. The first is the review of Explorer Harbor's room for making a story (the second
half of the rest of phase 10). The second is the review of Explorer Harbor's globe: the seven big lands and
fifteen famous places (the first half). The third is the review of Inventor Island's shelter, of the record a
grown-up keeps and of the portfolio (the rest of phase 09). The fourth is the review of Memory Forest's two
later activities (the rest of phase 08). The fifth is the review of Robot Ridge's three later activities (the
rest of phase 07). The sixth is the review of the help for a first visit (the rest of phase 04). The seventh
is the review of Reading Cove's later activities, from rhyme to a sentence (the second half of phase 05). The
eighth is the review of Number Garden's later activities, the ones that bring numerals in (the second half of
phase 06). The ninth is the review of the Music Lab (phase 11). The tenth is the review of the six worlds and
the voice (phases 04 to 10). The eleventh is Phase 03's review of what Phase 03 built. The twelfth is Phase
02's report on the home screen, kept as it was written, because it is still the assessment of the hub.

All are written to be useful to whoever works on this next, not to make the build look good. The ratings are my own
reading of screenshots and of the running game in headless Chromium. Nobody else has reviewed it, no child has
played it, **no person has listened to the voice**, and it has never run on a real graphics card. The owner has
opened the live site (Phase 03) on an iPhone; nothing in this file comes from a device. The standard it is rated
against is `docs/ART_DIRECTION.md`.

## Phase 10, the rest, second half (2026-11-26): a story to make up

### Summary

A room at Explorer Harbor, "Make a story". A child makes five choices, each by tapping a picture: who the
story is about (a fox, a bear or a rabbit), where it happens (the beach, the forest or the garden), what they
want there (two things in each place), what goes wrong (two things for each), and how it comes right (two
ways for each). The first three choices put the first page of a book together in front of the child; the
fourth makes the second page and the fifth the third. Each page is turned to with a leaf that goes over, and
told aloud as it is made; the whole can be told again from the beginning, or a page at a time by tapping one
of three small pages. Nothing is right or wrong, nothing is counted, and nothing is kept. Thirty-four pictures
are in `docs/review/explorer-harbor-story/`.

**My reading: it works, it is kind, and it is plain.** Every one of the 72 stories that can be made reads as
a story with a beginning, a trouble and an ending, and every one ends well. A child cannot get anything
wrong in it, and nothing on the screen suggests they could. The pictures are clear at the size a child
chooses between them on a small phone, and the one the story is about looks glad, then worried, then glad
again, on every page of every story. **What it is not is a storybook someone drew.** No page is drawn as a
whole: each is put together from a place, an animal and a small scene, which is how 216 pages come from 42
scenes, and it shows. The animals stand beside what happens and do not do it: a fox "runs" by leaning with
three lines behind it. The brief asks for beautiful illustrations and coherent expressions; the expressions
are coherent, and the illustrations are neat rather than beautiful.

### How it was made, which bears on how far to trust it

What a story can be is one file (`src/content/explorer-harbor/storymaker.json`): three who, three where, six
beginnings, twelve troubles, twenty-four endings, and the lines each is told with. It is not a lesson and is
not in the content pack: nothing in it has an answer. Its tests walk every way through, from nothing chosen
to the last page, and hold that none stops short, that every page has its lines and its picture, and that
the lines the voice was made from are the lines the game shows, to the letter.

The lines had to fit any of the three, so only the first and last pages name who the story is about ("One
day, Rabbit went into the forest. Rabbit wanted to pick some berries." and "Rabbit was happy. The end.").
What goes wrong and how it comes right are told without them: "But the basket had a hole, and the berries
fell out." "A big leaf went into the basket, over the hole." It keeps the recordings to 75 where naming them
throughout would have needed 147, and it avoids calling a fox he or she. It also makes the middle of every
story a little impersonal, and a person reading it aloud would not tell it that way.

The tests were made to fail before they were believed. 78 faults were put back, one at a time: 46 in what a
story can be, in its telling and in its pictures, against the unit tests, and 32 in the room, its styles and
the harbour's page, in a browser. **72 were caught at once** by the test meant for them. One was not a fault
as it was written. **Four found a test weaker than its name**: the pictures of the three animals were told
apart by their labels, so that a bear drawn as a fox was still "different from the fox"; the room kept for
the pictures to choose from was measured before and after a page was told and not while it was; where the
telling of a whole story is announced was asked for afterwards, by which time the book had turned to the
right page; and the check that the words for grown-ups are as wide as their part of the page measured three
paragraphs that happened to be the wide ones. Each was strengthened until it failed. **One found a rule that was not needed**, and the rule is
gone. `docs/TEST_RESULTS.md` has every one.

Nothing here was tried by a child, and **no person has heard the 75 new lines**. A recogniser heard each as
written. Three were reworded on the way: two that ran over the seven seconds a line is allowed, and one whose
shorter wording the recogniser heard differently ("or make" as "we'll make"), which went back to the wording
it heard rightly.

### The review

Looked at on a phone upright (390 by 844 and 320 by 568), on its side (844 by 390, 750 by 342 and 640 by 256),
on a tablet and on a desk; measured on nine sizes, at every turn of the story with the most words.

| What                      | How it is                                                                                                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The book                  | One page at a time, as large as the screen allows, in a white frame. Before anything is chosen it is blank paper with a dotted line where the ground will be; then someone stands on it; then the place is round them; then what they want is there |
| The three it can be about | A fox, a bear and a rabbit, drawn from the front, flat, each with two feet, two arms and a face that is glad, plain or worried. The same three in every place                                                                                       |
| The three places          | A beach with the sea behind it and a sun; a forest with trees along the back; a garden with a fence and three flowers. Nothing in them is written                                                                                                   |
| The scenes                | Forty-two: for each of six beginnings, what is there at the start, at each of two troubles, and at each of four endings. A kite, a sandcastle, a bush of berries, a stream, a picnic, an apple tree, and what happens to each                       |
| A choice                  | A picture of the page the story would have if it were chosen: the fox on the beach, in the forest, in the garden. Two or three at a turn, each 56 points or more however small the screen                                                           |
| The words of a page       | Under the page, for whoever reads: the line that is being said is marked while it is said. On the flattest phones they are read out and not shown                                                                                                   |
| Turning a page            | A leaf hinged on the left goes over in seven tenths of a second and the next page is under it; going back, the earlier page comes over. Where less motion is asked for there is no leaf and the page is simply the next one                         |
| The three small pages     | Under the book: which pages have been made, and which is open. Once the story is whole each turns the book to its page and tells it                                                                                                                 |
| Glim                      | Says each question, points at the book while a page is told, and is glad at the end. Tapped, says the question again; tapped while a page is being told, tells it again from its first line                                                         |
| At the end                | "That is your story. You can hear it again, or make a new one.", and two buttons: Again, and New story                                                                                                                                              |
| With the sound off        | The pages still turn and the words are there to read; told again, each page stays two and a half seconds and more to be looked at. The sound has a switch in the room, on and off                                                                   |
| What a grown-up can say   | On the harbour's page, under the note about the room: a switch they hold to say their child told a story back in their own words. It is kept with the day, shown as their word, and counted nowhere                                                 |

### Seen — cause — fix

| Seen                                                                                                                                          | Cause                                                                                                                                                           | Fix                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A worried animal that looked cross                                                                                                            | Its brows sloped down towards the middle                                                                                                                        | They slope up towards the middle                                                                                                                                                   |
| Two troubles that looked alike when small: no wind, and a tangled string                                                                      | Both were a kite lying on the sand                                                                                                                              | With no wind a flag hangs limp from its pole; with a tangle the kite is still up and a great knot is beside                                                                        |
| Berries "too high to reach" level with a raised paw                                                                                           | The tall bush was not tall                                                                                                                                      | Its lowest berry is above a paw held up from the ground, and within reach of one held up from a log                                                                                |
| Rain clouds cut off by the top of the picture                                                                                                 | They were drawn too high                                                                                                                                        | Lower                                                                                                                                                                              |
| Glim's button over the first picture to choose, by 1.3 points, on the flattest phone                                                          | The question, the pictures and the three small pages were taller together than the screen                                                                       | Glim is smaller there, on a button that is still 56 points                                                                                                                         |
| The two end buttons 170 points tall on a narrow phone                                                                                         | They had the columns the pictures have, and their words broke over three lines                                                                                  | Each is as wide as its own word, which is one short word or two                                                                                                                    |
| The book 183 points tall at the first question, 159 at the fourth and 151 at the end                                                          | What Glim says grew from one line to three, and the words of the last page from two to four                                                                     | Room is kept for three lines and for four from the start: the book is the same size at every turn                                                                                  |
| That fix doing nothing at first                                                                                                               | The rule for narrow phones stood above the rule it changes                                                                                                      | It stands after it; a test of the book's size at every turn found it                                                                                                               |
| On the harbour's page, a heading and a paragraph for grown-ups one letter wide                                                                | The new switch asked for a second column, as it has in the list above it; the section then had two, and every other thing in it was left the one with no width  | Under a room's note the switch has the section's one column. Seen in a picture of the page: nothing overflowed, so no test had said so; one measures every part of the section now |
| Switched on at the end, the sound telling the whole story over again                                                                          | When the sound comes on the room plays again whatever it played last, so that a question put before the first touch is heard after it                           | The switch has the room say where the story has got to, and nothing more                                                                                                           |
| After CI's first run on this: the test of the globe's mended turn failing in Safari's engine, as a phone, twice                               | The test stopped the page a tenth of a second into the turn and asked for three pictures to have been drawn by then; that browser on that machine had drawn two | The page is stopped when the turn is seen to be under way. It was met here by slowing the processor, which the tests can now do                                                    |
| In that run too: the grown-ups' page saying "Nothing recorded yet" of a skill just practised (a test read it, and passed at a second attempt) | The page drew its list from an empty record for the moment it took to read the real one: at every opening, since phase 01                                       | Nothing is said of any skill until the record has been read; a record that cannot be read is said to be that; a copy loaded into the same player is read                           |

### What is not right yet, or not known

- **No child has tried it, and nobody has heard it.** As everywhere here.
- **The pictures are put together, not drawn.** Each is clear and none is wrong, and a page is a diagram of
  what its line says more than an illustration of it. Someone who draws could replace the 42 scenes one at a
  time without touching anything else: each is a few shapes under a name.
- **The 72 stories are 24, each with a fox, a bear or a rabbit in it.** Who it is about changes the first
  and last lines and the animal in the pictures, and nothing that happens.
- **The middle of every story names nobody** (above).
- **A story is gone when the room is left.** Nothing is kept: not the story, not that one was made. A child
  who makes one they like cannot show it to someone that evening. Keeping the last one would be a small
  change to what is stored and was not made.
- **Nothing a child says is heard.** The brief asks for a child's own narration to be possible, led by a
  grown-up and without a microphone. It is: the three small pages turn the book for whoever is telling it.
  With the sound switched off in the room they turn it without a word. Whether anyone will do it is not known.
- **The question is not said again by itself.** A child who does not choose is not prompted; Glim says it
  again when tapped.
- **Told again in silence, a page stays for a fixed time**, which is long for a picture and short for
  someone reading four lines aloud to a child. The small pages do not have that limit.
- **On the narrowest phone upright the page is 214 points across.** Everything on it can be made out;
  it is the smallest the book is anywhere.
- **Safari's engine has not run it here.** CI's WebKit will; a leaf that turns in three dimensions is the
  kind of thing engines differ on.

## Phase 10, the rest, first half (2026-11-26): a globe, the seven big lands, and fifteen famous places

### Summary

Two more activities at Explorer Harbor, in three lessons, on a globe of the real world. In "The seven big
lands" a child is shown the shape of a continent and told its name, and finds it among three pins on the
globe; then is told the name only. In "Famous places" a child is shown a drawing of a famous place with the
shape of the continent it is in, is told both, finds the continent, and sees the place put where it is. The
globe turns under a finger, by two buttons and by the arrow keys. It has no word on it and no border: seven
lands and the sea. Twenty-eight pictures are in `docs/review/explorer-harbor-globe/`.

**My reading: it looks like a globe, and it can be answered on at every size that was tried.** The lands are
the real ones, known at a glance on anything from a small phone up; the pins are plain, large and alike; what
is asked for stands beside the globe and is the same picture a child is told the name of. **What I do not
know is what a child of four or five takes from it.** Matching a shape to a land on a ball is a real thing to
do. But "Famous places" tells the answer in its question ("The Eiffel Tower is in Europe. Find Europe."), so
what it asks is to find Europe, and what it gives is a first meeting with a place; it is recorded as a skill
like any other, and it should not be read as knowing where anything is. And the second lesson, with a name
and nothing to match, can be got right by the colour of a land once the colours are familiar: the lands are
kept near one another in colour for that reason, and are not the same.

### How it was made, which bears on how far to trust it

The outlines are Natural Earth's small-scale map of the world's countries, which is in the public domain,
made into seven continents by a script that is in the repository (`scripts/atlas/make_atlas.mjs`): countries
melted together so that no border is left, Russia divided at 60 degrees east, three small moves between
continents, and the outlines made coarser. Nothing trusts the script: 51 places a great many people could
point to must be on their own continent and no other, and 21 stretches of sea in none. That list did not
have Russia's far end in it, and the script had put it in Europe; it was found by looking at Europe's shape,
and the list has it now.

The arithmetic of the globe was written first and tested without a screen, then the content's rules, then
the drawings, then the screen. The fifteen places were drawn by hand, from no photograph and no other
drawing. Where each is was written down by hand and then compared with the coordinates on its Wikipedia
article, by a script that reads only the numbers: thirteen agreed to a hundredth of a degree; the Great Wall
is a long wall and the article's point is another stretch of it, and the article's point is now used; and
the article for Mount Kilimanjaro gave no coordinates to the script, so **its place stands unchecked**
(37.35 east, 3.07 south: written down as it was known, and compared with nothing). UNESCO's list, which would have been the better source for
most of them, could not be reached from where this was built.

Fifty-eight faults were put back in this work: thirty-one in the arithmetic, the rules, the generator and
the drawings, the outlines as they had been, twenty-three in a browser, and three in the tests' own tools.
Fifty-three were caught at once by the test meant for them. Four were not faults, or not the fault they
were meant to be, and were written again and caught; one of them is worth knowing: a pin on a ball falls
behind the finger that pulls it, so that after a long pull the finger is no longer on the pin it started
on. And one was caught by nothing, because the guard it took away guarded nothing; the guard is gone.
`docs/TEST_RESULTS.md` has each.

The pictures were looked at and then measured, on nine sizes, and the measuring found two things the
looking had passed: a turning button and a pin sharing a few pixels, and a pin's place 48 pixels across on
the narrowest phone held sideways. The browser tests found two more that neither had: a press lost for a
fifth of a second after a flick, and a keyboard left with nothing.

Nothing here was tried by a child, and **no person has heard the 56 new lines**. The names in them are the
ones a synthetic voice is likeliest to say wrongly: Kilimanjaro, Chichen Itza, Machu Picchu, Uluru, Fuji,
Taj Mahal, Oceania. A recogniser heard each of them as written, which says they are recognisable and not
that they are right; one of them, Uluru, it heard as written only after the synthesiser was given another
spelling.

### The review

Looked at on a phone upright (390 by 844), on its side (844 by 390, 750 by 342 and 640 by 256), on a tablet
both ways and on a desk; measured on nine sizes.

| What                     | How it is                                                                                                                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The globe                | A blue ball with a darker far edge and a glint where the light falls, faint lines of latitude and longitude every thirty degrees, and the lands in seven near colours: greens and yellow-greens, and white for Antarctica. Nothing is written on it. 366 pixels across on a phone        |
| The pins                 | Three, on three lands: a white button with a red dot, the same on each. The one on the land asked for is at the middle of that land; the others are on their lands, where they are at least 1.1 of the ball's radius from every other pin                                                |
| What is asked for        | Beside the globe: the land's shape in one plain colour on a white card; or a drawing of the place and the shape; or, where the name alone is given, a dashed frame with a sound in it until help is asked for                                                                            |
| A shape                  | The land as it looks from above its own middle. Not all of a land is in it: the far small islands are left to the globe (Svalbard, Hawaii), so that the part a land is known by fills its card                                                                                           |
| The famous places        | Fifteen small scenes with sky over them and ground under them, in the manner of the story pictures: three in Africa, three in Europe, three in Asia, two in North America, two in South America, two in Oceania. Ten are built and five are not. None has a person in it or a word on it |
| Turning it               | A finger pulls it and the land goes with the finger. Two round buttons turn it a step of forty degrees; so do the left and right arrow keys, and up and down tip it. It cannot be tipped past forty degrees: beyond that the lands are too squashed to know                              |
| Turned too far           | A pin that has gone round the back is not there to be pressed. A moment later the globe turns back by itself to where the question can be answered                                                                                                                                       |
| A wrong land             | Its pin goes grey inside a dashed ring. "Not that one. Look at its shape again." The land is not named: a child is not told what they found instead                                                                                                                                      |
| Help                     | First the shape is pointed at (or, where only the name was given, shown); then one wrong pin is taken away; then the right one is pointed at                                                                                                                                             |
| The land that is found   | A white edge all round it, a tick by its pin, and the globe turns until it is in the middle. A famous place is put on the globe where it is, as its drawing                                                                                                                              |
| Where nothing is to move | The globe is simply where it should be: at each question, after each press of a button, and at the land that is found                                                                                                                                                                    |

### Seen — cause — fix

| Seen                                                                                              | Cause                                                                                                                                         | Fix                                                                                                              |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A pale patch on the sea that could be taken for a land or a cloud                                 | The light on the ball was drawn as a large faint ellipse over the middle of it                                                                | A glint along the edge where the light falls, and a darker far edge                                              |
| Europe's shape small in a corner of its card                                                      | Far northern islands set the size of the picture                                                                                              | A shape is sized by the parts that are each a hundredth of the land or more                                      |
| A strip of Europe's colour at the far end of Asia                                                 | Russia past 180 degrees is numbered from -180 in the source, and fell west of the line the Urals are taken as                                 | It is Asia; two places there are in the list the outlines are held to                                            |
| A turning button and a pin's place sharing up to 3.9 pixels                                       | The buttons stood in the lower corners of the globe's square                                                                                  | They are never over the globe: at each end of the row under it, or at each side of it                            |
| A pin's place 48 pixels across on the narrowest phone held sideways                               | Pins could be 0.9 of the radius apart, which there is 46 pixels                                                                               | They are 1.1 apart, which there is 56; the 35 questions were made again                                          |
| A land found at the very edge of the globe, where a child had turned it                           | The globe stayed where it had been turned to                                                                                                  | When the land is found the globe turns to look at it                                                             |
| A tap on a pin straight after a flick: nothing                                                    | Chromium makes no click of a tap that follows a flick by less than a fifth of a second                                                        | A press is taken as the finger comes up on the pin it went down on                                               |
| An arrow key that turned nothing, after one that had turned the focused pin out of sight          | A pin that is out of sight cannot hold the keyboard, and the browser gave it to nothing                                                       | The keyboard is handed to the button that turns the globe that way                                               |
| After it was live: a press of a turning button that turned the globe half-way and back (CI, once) | The wait before the globe turns back by itself was counted from the press, and the page had stopped for two seconds in the middle of the turn | The wait is counted from when the globe has got where it was sent; a test stops the page in the middle of a turn |
| "Tap one of these" ringing the two turning buttons with the pins                                  | The ring went round every button on a board                                                                                                   | A button that is not an answer says so, and is not ringed                                                        |
| The harbour's part of the game too large for the limit every such part is held to (33.5 kB of 30) | 31 kB of outlines in with the code that draws them                                                                                            | The outlines are a file of their own, 12.1 kB compressed, counted with the content as a pack of challenges is    |

### What is not right yet, or not known

- **No child has tried it, and nobody has heard it.** As everywhere here.
- **"Famous places" is a first meeting, and is recorded as a skill.** Its questions give their own answers.
  What a grown-up reads says so twice, in the activity's summary ("a first meeting with the places, not a
  test of where they are") and in the skill's own words ("nothing here shows that a child knows where the
  place is"); but it is counted as practised and as done like any other skill. Phase 12 should know the
  difference.
- **Europe is never asked together with the two lands it joins.** With pins 1.1 of the radius apart, Europe
  is never one of three with Africa or with Asia (and five other pairs that are far apart never meet either:
  eight of the twenty-one pairs in all). A land is told from two others by its shape, and that is the whole
  of what is asked; telling Europe from Asia where they join is not. That was the price of a pin's place
  being 56 pixels on the narrowest phone held sideways.
- **Where Europe ends is a line.** Europe and Asia are divided through Russia at 60 degrees east, which is
  near the Urals and is not them, and elsewhere by which country a place is in; Europe's shape has a straight
  eastern edge because of it. Turkey, Kazakhstan, Egypt and Indonesia are each in one continent, the one the
  source gives them (but for the half of New Guinea that is Indonesia's, which is with the other half).
- **"Oceania" is one name of several.** Schools and maps also say Australia, or Australasia; the note for
  grown-ups says so. Both of Oceania's famous places are in Australia. Antarctica has none.
- **A wrong land is not named.** A child who presses Asia for Africa is told it is not that one and to look
  at the shape again, and is not told that what they pressed was Asia. Naming it would be a second thing to
  learn in the moment of getting the first wrong; it may still be the better choice, and it was not tried.
- **Mount Kilimanjaro's place was not checked against anything.** It is on the globe within a degree of
  where it should be, by the land under it; no source was compared.
- **On the narrowest phone held sideways the globe is 107 pixels across.** Everything on it can be pressed.
  Whether a land can be known by its shape there is not known.
- **The second lesson cannot be played without sound**, and says so before it starts. The first and the
  third can.
- **A screen reader is told where each pin is, and not which land it is on**, since that is the answer. It
  can be answered by position only by someone who already knows the map. That is true of the island maps too.

## Phase 09, the rest (2026-11-26): a shelter from the wind, a grown-up's word, and "My inventions"

### Summary

A fifth activity on Inventor Island, a switch, and a room. In the activity a wall is stood up to keep the
wind off a plant. The wind comes from the left in some questions and from the right in others, and a prop is
on one side of the wall or the other; a child says whether the wall will stand before it is tested, and then
mends walls that do not. Under each thing to try together away from the screen is a switch a grown-up holds
to say it was tried. And "My inventions" is a page with the last thing mended at each workbench, drawn from
the answer itself. Twenty-one pictures are in `docs/review/inventor-island/`.

**My reading: the shelter reads, on a phone and on anything larger.** Which way the wind blows is said three
times over, by where the pole stands, by which way its pennant flies and by the streaks; a wall standing and a
wall lying flat cannot be mistaken for each other; a prop is on one side or the other. **What I do not know
is whether a child of four or five takes from it what it is about**: that a thing is held from the side it
would fall to. That is a harder idea than "more posts hold more", and here it is carried by watching a prop
come down that held nothing. The record and the portfolio are plain, and say nothing they do not know.

### How it was made, which bears on how far to trust it

The model was written first and tested without a screen: set-ups worked out by hand, the same set-up with
left and right changed over, the directions it claims, and what it must refuse. Then the picture's own
arithmetic, then the content's rules, then the screen. Seventy faults were put back in this work: fifty-nine
in the island's own (ten in the model, ten in the picture and its words, six in the content's rules, nine in
the record and the portfolio, twenty-four in a browser) and eleven in what CI's two runs led to. Sixty-seven
were caught at once by the test meant for them. One was caught by nothing, and the model was wrong to allow
it; one was caught only by the linter; one did not build, and so showed nothing. `docs/TEST_RESULTS.md` has
each.

The pictures were looked at and then measured, and again the measuring found what the looking had passed: the
portfolio's pictures were smallest where there was most room.

Nothing here was tried by a child, and no person has heard the ten new lines.

### The review

Looked at on a phone upright (390 by 844), on its side (844 by 390, and 640 by 256), and on a desk (1366 by
768); measured on seven sizes, and the portfolio on twelve.

| What                           | How it is                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What is asked about            | A meadow. A pole on the side the wind comes from, its pennant flying with the wind: straight out in a gust, drooping in a breeze. Blue streaks, two for a breeze and four for a gust, each curled at its leading end. A wall in the middle, low or tall; a seedling or a sunflower behind it     |
| The two answers to a guess     | The wall standing, and the wall lying flat, away from the wind, with two streaks past it and the plant bent over. On a phone each is 366 by 184; the smallest they are is 192 by 107                                                                                                             |
| The test                       | The streaks move; a wall that goes over goes over away from the wind; a prop that held nothing comes down after it; the plant bends. About two and a half seconds, and the picture stays as it ended                                                                                             |
| A guess that did not come true | Kept beside what happened, as at every workbench here: the child's card keeps its mark, and the other card is the one lit                                                                                                                                                                        |
| A mend                         | The picture, and beside or under it what can be changed, as pictures: a wall alone, a wall with a prop on its left, a wall with a prop on its right; a low wall or a tall one where the wall is the trouble. Each is 93 pixels wide or more. Then "Test"                                         |
| A mend shown                   | Glim's words, about six and a half seconds of them, then the trouble tested so that the wall is seen to fall, the prop put on the far side, and the test again. 13.4 seconds in all, and "My turn" comes when it is over                                                                         |
| The switch                     | Under each thing to try, in the part of the island's page written for grown-ups: a round button with a tick and "Hold to say you tried this together." Held for a little over a second it turns yellow and says "Tried on 26 November 2026. That is your word: the game did not see it."         |
| "My inventions"                | Five cards. A bench where nothing has been mended shows what is waiting there, faint, inside a dashed edge, and leads to it. A bench where something has is in full colour, and a tap tests it again. Under each, for the grown-up: when it was mended, how the guesses went, and what was tried |

### Seen — cause — fix

| Seen                                                                                                                                    | Cause                                                                                                     | Fix                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| In the first drawing the wind could not be seen, and the whole scene was small in its frame                                             | White streaks on a cream ground; everything drawn smaller than its frame had room for                     | Blue streaks with a curl at the leading end; everything drawn larger                                             |
| On a desk, each of the portfolio's pictures was 146 pixels across, with half the page empty under them; on a tablet, four cards and one | "As many as fit", each at least 150 wide, on a page at most 920 wide                                      | Set out for the screen: five in a row at 218, three and two at 209 to 299, two by two and one, one under another |
| A tap on a picture, in Safari's engine, seen by nothing as the sound came on (twice in CI)                                              | The game told its listeners the audio had woken in the middle of the press, and the page drew again there | They are told when the press has been delivered                                                                  |

### What is still wrong or weak

- **No child has tried any of it.** Above all, whether "held from the side it would fall to" is something a
  child of this age takes from watching. If it is not, the guesses are a coin tossed and the mends are trying
  each picture in turn, which the activity allows and cannot tell from understanding.
- **Left and right are pictures.** A child who cannot say which is which can still choose rightly by matching
  the prop to the side the wall fell to. Nothing shows that this is how a choice was made.
- **The model is a toy, and in one thing it is the opposite of a tent.** A prop here holds only from the side
  away from the wind. A peg and a rope hold from the side the wind comes from, and a child who has put up a
  tent knows it. The table in `docs/CURRICULUM.md` says so, and the portfolio says the models are toys; the
  activity itself says nothing.
- **A wall that stands and is too low is only ever met in a mend.** A guess offers two endings, stands or
  blows over, and never the third.
- **On the narrowest phone held sideways the wall is 6 pixels by 25**, and the prop about 20 long. It is the
  scale every workbench here is drawn to on that screen.
- **On a desk, the picture that is asked about is drawn smaller than the two answers under it**: about 350
  pixels across in a frame 841 wide, over answers whose cards are 430 wide. So it is at all five workbenches,
  and has been since the island went live.
- **The island's page is long**: 3660 pixels on a phone, twice Memory Forest's. Five things to try, each with
  what is needed, the mess, two questions and what to watch for, is a lot of words; all of it is for the
  grown-up, and Play is at the top.
- **A grown-up's word is only that.** The game cannot know whether anything was tried, and says so wherever
  it shows the word. A child who holds the button for a second can say so too. It counts towards nothing,
  which is the only reason that does not matter.
- **The portfolio keeps one thing for each workbench**, the last mended, and an earlier one is gone from it
  (not from the record). Nothing can be built freely, so nothing a child made up is ever there.
- **On a desk its pictures are 218 pixels across**: better than 146, and still modest on a large screen.
- **Nothing asks the child what changed.** The brief's last step, saying what was different by choosing a
  picture, is not built; the thing to try together asks it aloud.
- **A test may now fail for being slow though everything it checked was so**: one that uses more than three
  quarters of its time limit. That is deliberate, and on a machine slow enough it will be a nuisance before
  it is a help.
- **Nobody has heard the ten new lines.**

## Phase 08, the rest (2026-11-26): your own way to remember, and keeping it for next time

### Summary

Two activities after Memory Forest's six. In the first, four things are on show with three pictures under
them, and a tap on a picture lays the same four out another way: in two groups, as who has what, or each at a
place. The way they are in when the child puts them away is the way that was chosen; one question follows with
the hint that belongs to that way, and then the same four are asked for with no hint at all. In the second
there are five things, all new, and then three to keep, which are asked for again at the start of the next
visit with nothing shown. Nineteen pictures are in `docs/review/memory-forest/`.

**My reading: the boards work and fit, on every screen I can try, and what each asks is plain to me. Whether a
child of four or five takes the three pictures for ways of looking, and not for buttons that move things
about, I do not know, and for most four-year-olds I doubt it.** The activity does not depend on it: whichever
picture was pressed last, the question that follows fits how the things were lying.

### How it was made, which bears on how far to trust it

The rules were written first and tested without a screen: a question that follows another and is asked again
with it, a thing kept from one sitting to the next and when it may be asked for, an answer that carries the
way in it. Eighty-four faults were put back in this work: fifty-one against the unit tests and thirty-three in
a browser. All but two were caught by the test meant for them. One of the two was a check that could never
matter, and it is gone; the other is a rule no test holds, and it is said so below.

The pictures were measured as well as looked at, and the measuring found what the looking had missed: on a
phone held sideways the five things to remember were 33 pixels across.

Nothing here was tried by a child, and no person has heard the twenty-one new lines.

### The review

Looked at on a phone upright (390 by 844 and 320 by 568), on its side (844 by 390, and 640 by 256, which is
all a browser leaves the narrowest), and on a desktop.

| What                           | How it is                                                                                                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The four things as they come   | A row of four. On an upright phone each is a picture about 58 pixels across in a box of 77: the smallest anything is on these boards, for the moment before a way is chosen                                                                                          |
| In two groups                  | Two rings, two things in each; on an upright phone one above the other, each 90 pixels or more (side by side, four across, they were 71)                                                                                                                             |
| As a silly story               | Two pairs: who has it, large, and the thing at its side, smaller. It reads as "the bird has the bell"                                                                                                                                                                |
| At places                      | Four places with a thing on each, two and two on an upright phone. At 640 by 256 a thing on its place is 50 pixels or more; it was 28 when the board shared the width as other boards do                                                                             |
| The three pictures that choose | Two rings of dots, a face in a hat with a star, a dotted path with a flag. 116 by 238 on a phone 390 wide; 58 by 107 at 640 by 256, in a column of their own. The one chosen is ringed. They are signs, not pictures of anything: I can read them, having drawn them |
| The question                   | The leaf covers the things, and in front of it is one card: one of a group, an owner, or a place. Three cards to answer with: the right one, one that was there and went with something else, and one that never was                                                 |
| A wrong answer                 | The card fades and is set aside, and nothing is uncovered. After two, the one left is pointed at, and giving it ends the step as helped                                                                                                                              |
| All four, with no hint         | The bare leaf, and eight cards: three across on a phone, one row at 640 by 256 where each is 57 wide                                                                                                                                                                 |
| Five things                    | Three and two, on a phone held either way: 89 pixels or more upright at 390 wide, 66 at 844 by 390 (in one row each was a picture about 47 pixels across upright, and 33 pixels sideways)                                                                            |
| The next visit                 | The leaf with a sign on it, an arrow going back round a dotted clock, and six cards. "Think back to last time. Which three did you keep?" Nothing else is on the screen, and nothing is shown first                                                                  |

### Seen — cause — fix

| Seen                                                                                                                                                         | Cause                                                                      | Fix                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| On a world's page, every card moved down as the page finished arriving: 15 to 78 pixels                                                                      | A card's name came with the world's content, and some names take two lines | What each activity is called is known at once, from a small list the content build writes; room is kept for the pictures |
| Things in two groups were 71 pixels across on an upright phone                                                                                               | Four in a row                                                              | The two of a group stand one above the other                                                                             |
| On the narrowest phone held sideways the four things were 28 pixels across                                                                                   | The board gave them a third of the width, as boards do                     | They have all the width but a thumb's worth for each way's picture                                                       |
| Nine cards to answer with were 51 pixels wide at 640 by 256                                                                                                  | Nine in one row                                                            | Five things are picked out from eight cards                                                                              |
| Five things to remember were 33 pixels across on a phone held sideways; four, which is live, are 46 there and 39 on an iPhone 13 (measured on the live site) | One row, in the narrow column a sideways phone gives them                  | Two rows of three for five or six; two and two for four. Tests at 844 by 390, 750 by 342 and 640 by 256                  |

### What is still wrong or weak

- **No child has tried any of it.** Whether choosing how to look means anything to a child of this age is not
  known. What is written down is which way the things were in when they were put away; nothing shows that the
  way was used to remember by, and the mastery engine to come should not read it as a strategy used.
- **The three pictures that choose a way are signs.** A child may press them because they are there. That
  does no harm, and teaches nothing either.
- **"Later the same day" means ten minutes or more.** Ten minutes is a guess at where remembering stops being
  holding on. And a day is the device's date: a visit at five to midnight and one at five past are two days.
- **A child who does not come back to this activity is never asked.** Nothing reminds anyone, and what was
  kept is asked for nowhere else. For a family that plays it once, there is no later.
- **What is asked back is picked out from six cards, not said.** Knowing a thing again is easier than calling
  it to mind, and the game cannot hear a child say a name. The skill is worded as picking out.
- **The sign for "last time" is my guess at a picture of the past.** The line that is said carries it; with
  the sound off, a child who cannot read has the sign and six cards.
- **Before a way is chosen the four things are at their smallest**, a row of four on an upright phone.
- **On the smallest screens five things are still small**: a box 49 pixels wide at 320 by 568, where they
  stay in one row because the leaf is too low for two, and 55 at 640 by 256.
- **The answer with no hint does not say which way came before it.** It is the next line in the record, so
  the two can be read together; nothing reads them so.
- **For a blink, a world's page sends Play to the beginning for everyone.** Until it has read who is playing
  and what they have finished, it cannot do otherwise, and it now says so in the page (`data-settled`). Nobody
  taps in that blink. A test did, and for that reason had been passing whatever was stored.
- **Room is kept for a second line under "Play" on a world's page, and no test holds it.** The note there
  changes when the page learns what a player has finished, and can go from one line to two. The rule that
  keeps the page still then was put in on reasoning; taking it out fails nothing.
- **Nobody has heard the twenty-one new lines.**

## Phase 07, the rest (2026-11-26): a longer way, a long way round, and the bridge

### Summary

Three activities after Robot Ridge's four. In two of them a child plans four to ten steps round rocks and can
run the plan all at once or a step at a time, on and back. In the third there is a river with a bridge that may
be up or down, and one more step, which waits for it. Fourteen pictures are in `docs/review/robot-ridge/`.

**My reading: the boards work and fit, on every screen I can try; whether a child of four or five can do what
they ask, I do not know, and for the long way I doubt it for most.** Ten turns and moves, each turn told from
where the robot is facing, is hard for an adult to plan whole. That is why the row can be made a step at a
time with the robot showing each step as it is put in, and why these activities come last and nothing waits
on them.

### How it was made, which bears on how far to trust it

The rules were written first and tested without a screen: what a step that waits does, what a bridge that is
up stops, where the robot stands when a row is changed under it. The grounds of the long ways are drawn from
seeds and kept only if there is one shortest way and the rocks are what make it long; a second piece of code
finds every shortest way by other means and must agree with the first. Sixty-one faults were put back in this
work. All that could be caught were; the two that were not were checks that can never fire, and they are gone.

Nothing here was tried by a child, and no person has heard the nine new lines.

### The review

Looked at on a phone upright (390 by 844 and 320 by 568), on its side (844 by 390, and 640 by 256, which is
all a browser leaves the narrowest), and on a desktop.

| What                         | How it is                                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A long row on a phone        | Two lines of small tiles between the two buttons that step. The tiles are looked at and not pressed: 53 by 27 on a phone 390 wide, 37 by 26 on one 320 wide, 47 by 27 at 640 by 256. Each arrow in them can be told from the others; they are small |
| Everything that is pressed   | 56 pixels or more each way on every screen measured: the arrows, the key that takes a step out, the two that step, "go"                                                                                                                             |
| The ground                   | A square is 30 pixels across at 640 by 256, on a ground six squares wide, and 52 or more upright. The robot's eyes and light still say which way it faces at 30; only just                                                                          |
| One step on, one step back   | The step just carried out is lit in the row, and the robot stays where it is while more steps are put in. This is the best thing in the three activities: it turns a long plan into something that can be found out                                 |
| The bridge                   | Seen from above: planks from bank to bank when it is down, drawn back to each bank with water between when it is up, going up and down while nobody knows. It reads to me. I drew it, so that is worth little                                       |
| The step that waits          | Three dots, and the same three dots stand over the robot while it waits. Chosen because a pair of bars is already the pause button                                                                                                                  |
| Glim's showing of the bridge | The same row run twice, with the bridge up and then down, with what is happening said and written at the moment it happens. Under eight seconds with nothing said                                                                                   |

### Seen — cause — fix

| Seen                                                                                    | Cause                                                                                                        | Fix                                                                                                                   |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| On the world's page, the robot in the bridge's picture could not be made out on a phone | The picture is an activity's first journey, and that was on a ground three rows high in a box 48 pixels high | Both demonstrations are on grounds of two rows                                                                        |
| A test could not press an arrow when the row was full                                   | The arrow says it is waiting, and it is; a finger can still land on it                                       | Nothing in the game: the tap makes the key that takes a step out stir, as it should. The test taps where the arrow is |

### What is still wrong or weak

- **No child has tried any of it.** Whether three dots mean "wait" to a five-year-old, whether the bridge is
  seen to be up, and whether a key with a cross on it is seen to take a step out, are all guesses.
- **Ten steps is very likely too many for most children of this age to plan.** The activity lets the row be
  built a step at a time, which is a way through, and it is the last one in the world.
- **The record does not tell a plan from a row found out step by step.** What is written down is that the
  first full row arrived. The skill is worded to match. The mastery engine to come should not read it as
  planning ahead.
- **Left and right are still the robot's, not the child's.** A robot facing down the screen turns "left"
  towards the child's right. Nothing new helps with that, and a long way has more of it.
- **The tiles of a long row are small on the smallest phones**, 26 pixels high. They are not pressed, and they
  can be told apart; a child who looks closely at a small thing may still try to press it, and nothing happens.
- **A row gone over after it failed can only be looked at.** Stepping back and on does not hand it in again,
  which is right, and nothing on the screen says so.
- **One condition, one thing sensed.** There is no "or else", and nothing but the bridge is ever waited for.
  It is the beginning of "if", and no more.
- **Nobody has heard the nine new lines.**

## Phase 04, the rest (2026-11-25): help for a first visit

### Summary

Phase 04 asked for a voice and for a way in for a child who cannot read and may never have used a screen. The
voice was built first. This is the way in, and it is four things, none of them a world:

- **How to play.** Someone who has never played is taken from the front door to a page where Glim shows three
  things and the child does each: tap the one that is asked for; tap a picture and it goes to its place, then
  the tick; tap Glim to have a thing shown again. Then the arrow, which is the way on everywhere.
- **Help with the screen.** When a child's taps land on nothing, an activity points out what can be pressed.
- **A grown-up is helping.** A switch a grown-up holds down, after which answers are written down as helped.
- **Where to begin.** In the grown-ups' area: what a grown-up has seen the child do, and where Play begins.

**Two things the brief asked for are not here, on purpose, and a reader should know it before reading on.** It
asked for a demonstration of dragging: nothing in this game is dragged. Every board answers a tap, because a
tap is within reach of a hand that cannot yet hold a thing down and move it; what is shown instead is the tap
that puts a picture in its place. And it asked for a few sample questions to place a child. There are none. A
handful of questions on a first visit is a test of how a child takes to a new screen; the grown-up's word, and
a link to the real activity to watch the child try, do that work here.

**And the risk is the usual one, stated plainly: no child has been near it.** "How to play" is the first
thing a new player meets, so it is the part of the game where being wrong costs most.

### How it was made, which bears on how far to trust it

In one working tree, by one hand, straight after Reading Cove. "How to play" is drawn with the lesson's own
parts (the same classes, the same tick, the same arrow, Glim as the same button), so it cannot drift from what
an activity looks like; but it does not go through the engine, and its rules are a file of their own, written
and tested as data before any screen was drawn. It was then looked at in the running build at four screen
sizes, changed, and looked at again. Eighty-six faults were put back, one at a time, to see the tests fail;
seven of the tests did not, and were themselves at fault.

Four faults in the game were found by tests and by nothing else. On the phone's screen the showing ran short
and its lines ran into one another, because it asked how long each line lasts a moment before the voice was
awake. It would have been heard at once by anyone listening, and nobody is listening: that is the state of
the whole project in one bug. The other three were found by running everything on every screen: a hand two
pixels below the foot of a phone held sideways, a bell whose swing left a small phone's screen, and "shown"
written down too late to survive the page being left at once.

### The review

Looked at in the running production build at 390×844, 640×256 and 1366×768, and measured at six sizes:
`docs/review/first-visit/`, 18 pictures. 1 = poor, 3 = acceptable, 5 = excellent.

| Category             | Rating | Why                                                                                                                                                                                                                                             |
| -------------------- | :----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |   4    | An activity's own layout, so nothing is new to the eye when the first real activity opens. One thing on the stage at a time. The bell, the last of the three, stands alone in a box with a good deal of air round it on a tall phone.           |
| Craft and materials  |  3.5   | Kit pictures (a sun, a fish, an apple, a hen, a bell) and the lesson's cards. Nothing was drawn for it. Glim's hand is the small pointing hand the boards already use; it is plain, and on a large screen it is small beside what it points at. |
| Cohesive palette     |   4    | The harbour's colours and the kit's. Sun yellow means "this, now" as it does everywhere: the lit choice, the arrow, the ring of a nudge, the nudge's words in Glim's bubble.                                                                    |
| Liveliness           |   3    | The hand bobs, a chosen card settles, the bell swings when it is rung, Glim celebrates. Between those nothing moves, and a picture does not travel to its place: it is in the tray and then it is in the place.                                 |
| Interface legibility |   4    | Everything a child presses is 56 points or more on every screen shape, measured by the tests. The grown-up's switch is a grown-up's size and sits where the pause button will be.                                                               |
| Motion quality       |  3.5   | Each showing is a hand on a thing and then the thing happening, in time with the line that says it. With the sound off each line still gets its time. Seen in a browser, never against the sound.                                               |
| The sound            |   —    | **Not rated.** Twelve new lines, heard by a recogniser and by nobody.                                                                                                                                                                           |
| Child comprehension  |   —    | **Not rated.** No child has seen it.                                                                                                                                                                                                            |

Measured, in pixels, in headless Chromium (across, high):

| What is pressed                            | 320×568  | 390×844  | 844×390  | 640×256  | 768×1024 | 1366×768 |
| ------------------------------------------ | :------: | :------: | :------: | :------: | :------: | :------: |
| A picture to choose                        | 296, 107 | 366, 184 | 257, 241 | 192, 107 | 354, 430 | 430, 293 |
| A picture to put in its place              | 145, 179 | 180, 225 | 190, 241 | 143, 107 | 355, 393 | 429, 267 |
| A place                                    | 133, 155 | 164, 205 | 180, 221 | 133, 87  | 339, 361 | 414, 238 |
| Glim, the "show me again" button           |  85, 80  |  85, 80  |  75, 71  |  75, 71  | 120, 114 | 120, 114 |
| The tick                                   |  64, 64  |  64, 64  | 144, 56  | 144, 56  | 144, 56  | 144, 56  |
| The arrow                                  |  64, 64  |  64, 64  | 142, 56  | 142, 56  | 142, 56  | 142, 56  |
| The house, the way out                     |  56, 56  |  56, 56  |  56, 56  |  56, 56  |  56, 56  |  56, 56  |
| Glim's hand (it is not pressed; it points) |  44, 44  |  44, 44  |  44, 44  |  44, 44  |  44, 44  |  44, 44  |
| The grown-up's switch, here and on pause   |  48, 48  |  48, 48  |  48, 48  |  48, 48  |  48, 48  |  48, 48  |
| A box to choose in, in "where to begin"    | 232, 48  | 302, 48  | 620, 48  | 518, 48  | 620, 48  | 620, 48  |

Everything a child presses is 56 points or more in both directions at every size. What a grown-up presses is
48, which is this project's size for grown-ups' controls.

### Seen — cause — fix

| Seen                                                                                                     | Cause                                                                                                                                    | Fix                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| On a phone, the words of a nudge lay across the arrow they were pointing at                              | They were a note drawn over the foot of the screen, in the middle                                                                        | They are written where Glim's words are, in the bubble at the foot, in the sun colour. Nothing is drawn over anything                  |
| The showing ran short on the phone's screen, and each line began on the last word of the one before      | How long each line lasts was asked once, as the page opened: a moment before the tap that brought the child there had woken the voice    | Each beat's wait is worked out when the beat before it has happened                                                                    |
| On a phone held sideways, with Glim's hand on Glim, the page was a pixel or two taller than the screen   | The hand hangs a little below whatever it points at, as it does under a card; under the foot of the screen there is nothing to hang into | At the foot of the screen the hand stands inside what it points at. A test holds it still at its lowest, on every screen, and measures |
| On a phone 360 wide, for most of a second after the bell was rung, the page could be pushed sideways     | A square that turns is wider, corner to corner, than it was: the bell's swing reached 16 points past the edge                            | What swings inside the box stays inside it                                                                                             |
| A child shown "how to play" to its end was shown it all again, if the page was left the instant it ended | That the player had been shown was written down as the page was left, and the page had gone before the writing was done                  | It is written as soon as the last of the three things is done                                                                          |
| The bell's box filled the whole stage, a tall dashed frame round a small bell                            | It was given the room a question's picture and its choices share                                                                         | It is as large as it needs to be, in the middle                                                                                        |
| Under "placing", four lines of words at the foot of a phone                                              | Both of its lines were written at once: where the picture goes, and what the tick is for                                                 | One at a time: the line about the tick is written once everything is in its place, which is also when it is said                       |
| A switch that sets aside every answer of a visit could be flipped by a stray tap                         | It was drawn as the pause screen's other switches are: tap to change                                                                     | It is held down to change, either way. A tap, by anyone, does nothing to it                                                            |
| "Tap the arrow when you want a turn" was heard by the recogniser as "…when you want to turn"             | "a turn" and "to turn" are one sound apart                                                                                               | The line is "Tap the arrow, and then it is your turn."                                                                                 |
| A child who keeps tapping a picture would have been told "Tap one of these" every third tap              | The line was said whenever the ring was shown                                                                                            | The ring comes back each time; the line is said once for a step, and a line kept back while Glim was talking is said the next time     |

### What is still wrong or weak

- **Nobody has watched a child meet it.** Whether three things shown once each by a hand and a voice are
  followed by a three-year-old; whether half a minute is too long to wait for the first island; whether a child
  taps the hand instead of the thing under it. All unknown, and this is the page where it matters most.
- **Three kinds of tap are shown, and the game has more kinds of board.** Pairs to turn over, a robot's steps to
  lay down, a beat to tap, a place on a map, a thing to mend: each is shown only by its own activity's first
  step. "How to play" teaches the commonest three and the arrow.
- **A picture does not travel to its place.** It is in the tray, and then it is in the place. The line says "it
  goes to its place"; what is seen is that it is there. A short flight would say it better and is not built.
- **The hand is small on a large screen**: 44 points beside a card that is 300 across on a desktop.
- **Where to begin is rules of thumb.** Three of them, written here by nobody who teaches, and each passes over
  everything before the chosen activity, not only what was seen. The card says so in its own words, and a
  grown-up can choose any activity instead.
- **The numbers in the nudge are guesses.** Three taps, eight seconds, five seconds on the screen, eight seconds
  before a tick is pointed out. A child who taps a picture because it is a picture is told what to press.
- **"A grown-up is helping" lasts the visit.** Left on, a child's later answers alone are written down as
  helped. The only sign is the mark on the pause button. It errs towards claiming too little, which is the
  right way to err, and it is still an error.
- **The hold is not a lock.** A child who holds a finger on the grown-up's mark for a second and a fifth
  changes it. So is the gate to the grown-ups' area; neither is described as more than it is.
- **A tab closed in the middle of "how to play" brings it back** at the next visit, until the child has done
  it, passed it by, or begun an activity. That is meant; whether it is welcome is not known.

## Phase 05, second half (2026-11-25): rhyme to a sentence in Reading Cove

### Summary

Reading Cove had ten activities and stopped at a printed word of three letters. It has sixteen. Two of the new
ones come early, before any letter, and are done by ear: which one rhymes, and clap the word. Four come after
the printed word: a word to build from its three letters; sh, ch and th; words with those in them; and a
sentence of five words, answered by the picture it tells of.

What is new in how they are made is that the screen now follows the voice. A word is said in its beats and a
clap lands on each; a word is said slowly and the place of each letter lights as its sound begins; a sentence
is read and a finger stands under the word that is being said. The moments come from the synthesiser, which
knows which of its samples belong to which sound, and are written down with each recording.

**That is also the whole of the risk, and it is the same risk as before with more resting on it.** Nobody has
heard a clip. Now clips are cut inside words, and things happen on the screen at moments inside clips, and
nobody has checked either against what can be heard.

### How it was made, which bears on how far to trust it

In one working tree, by one hand, straight after Number Garden's numerals. The content is 75 challenges written
as rows of tables; rules that work each answer out again, from how the words are spelt and clapped, refuse a
row that is wrong, and every rule is shown to fire. The ten activities that were live could not be changed in
the making of it (each lesson is held to a mark made from the whole of it), and were not. Eleven pictures were
drawn for it. Every picture of one thing on or in another, twenty-nine of them, was looked at on one sheet; the
activities were looked at in the running build at six screen sizes, changed, and looked at again. Thirty-seven
faults were put back, one at a time, to see the tests fail.

What made the clips was changed as well as used, which matters: 25 recordings of slow words that were already
live were made again, by a different cut. Each was heard by the recogniser as it had been heard before.

### The review

Looked at in the running production build at 390×844, 320×568, 844×390, 750×342, 640×256 and 1366×768:
`docs/review/reading-cove/`, 19 pictures. 1 = poor, 3 = acceptable, 5 = excellent.

| Category             | The six | Why                                                                                                                                                                                                                                                             |
| -------------------- | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |    4    | One thing asked about, two or three to answer with, as everywhere. A word to build has its picture above three places and its letters below. A sentence is print across the top and its pictures in a row under it. A tall phone leaves air round a short word. |
| Craft and materials  |   3.5   | The print is the letters a child is taught, and is good. The pictures of one thing on another are two kit pictures put together by arithmetic: they read, and they are plain. Of the eleven new pictures the chip is the weakest: a ruffled yellow shape.       |
| Cohesive palette     |    4    | The cove's coral and the kit's colours. Coral is the one colour that means "this, now" in what is read: the end of a word, the finger under a word.                                                                                                             |
| Liveliness           |   3.5   | A clap pops and the picture nods on each beat; a place lifts as its sound comes; a finger steps from word to word. Between questions nothing moves.                                                                                                             |
| Interface legibility |    4    | Everything pressed is 56 points or more on the four tightest screens, measured. Print is the new thing to be legible, and on the flattest phone held sideways it is small (below).                                                                              |
| Motion quality       |    4    | Every movement is the thing being taught, at the moment it is said. With motion reduced nothing is followed: the board stands still and the words are still said. Seen in a browser, not on a device, and never against the sound.                              |
| The sound            |    —    | **Not rated.** Nobody has heard a clip, a cut or a clap.                                                                                                                                                                                                        |
| Child comprehension  |    —    | **Not rated.** No child has seen it.                                                                                                                                                                                                                            |

Measured, in pixels, in headless Chromium:

| What is read or pressed                          | 320×568 | 390×844  | 844×390 | 640×256 | 768×1024 | 1366×768 |
| ------------------------------------------------ | :-----: | :------: | :-----: | :-----: | :------: | :------: |
| A small letter of a sentence (how high)          |   18    |    30    |   18    |   13    |    35    |    22    |
| A small letter of a word to read                 |   23    |    29    |   19    |   13    |    30    |    30    |
| A small letter on a tile to build with           |   20    |    27    |   23    |   16    |    39    |    39    |
| A letter tile to press (across, high)            | 95, 118 | 118, 147 | 95, 241 | 71, 107 | 232, 291 | 281, 199 |
| A clap on a card (across)                        |   44    |    82    |   67    |   43    |    95    |   116    |
| The thing underneath, in a picture of two things |   123   |   156    |   179   |   87    |   334    |   380    |
| A picture to choose, for a rhyme                 |   87    |   164    |   221   |   87    |   334    |   273    |

### Seen — cause — fix

| Seen                                                                                                            | Cause                                                                                                                             | Fix                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A slow "ship" was heard by the recogniser as "chip"                                                             | The word was cut where the synthesiser says its first sound begins, and a soft sound is under way a tenth of a second before that | A word is cut in the silence before it. The "sh" of the slow "ship" is now 0.3 seconds long                                                        |
| There was no silence to cut in: the voice ran "is" straight into "ship", every time                             | The sentence that carries a word ended "…is, ship"                                                                                | Words that are cut this way are carried by "…is that, ship": the "t" closes before the comma. A take with no silence is thrown away                |
| The mark a clap leaves was a second, smaller sun beside the picture of the sun                                  | It was a spark: a round middle with rays                                                                                          | A clap is two hands meeting, with three short lines of sound                                                                                       |
| Three claps on a card ran into one another and off its edges                                                    | They were drawn at a size that suited one                                                                                         | Sized so that three fit, with room between                                                                                                         |
| On a phone held sideways a sentence had letters a few pixels high                                               | It stood in the narrow column every question's picture gets there                                                                 | A sentence has about half the width, like the other wide pictures                                                                                  |
| On the narrowest phone held upright a sentence's small letters were 10 pixels high                              | Five words on one line, 320 points across                                                                                         | On a phone held upright a sentence is set on two lines, and its pictures stand side by side under it: 18 pixels there, and 30 on an ordinary phone |
| On the world's page the card for the sentence activity showed a hair's breadth of print                         | A card shows what the activity asks about, and that was the whole line                                                            | The card shows its first two words                                                                                                                 |
| The recogniser heard "a cat on a cart" and "a hen on a heart"                                                   | Read as slowly as that, the short last word was drawn out into another                                                            | A sentence that is not heard right is read again a little faster; both were then heard right                                                       |
| The finger under a word that was read out ran along at one speed, whatever the word and however it was said     | It was an animation of fixed length, from before clips had marks                                                                  | It stands under the tile of the sound that is being said, and steps on with it                                                                     |
| The word fetched ahead for a letter was not the word its script then said                                       | The script gives a letter a word that is not already on the table; what was fetched was the first word, whatever was on the table | Both ask the same way. Found by a test that goes through every question and checks that whatever it says has been fetched                          |
| A browser test said a word "is not read out" because its clip had not been fetched; clips are now fetched ahead | Fetched and said had been the same thing, and stopped being                                                                       | The voice tells the page each line as it begins to play; tests listen                                                                              |
| A new browser test failed with no fault in the game                                                             | It read what had been said the instant the way on appeared, and the way on is in the page the instant an answer is given          | It waits for the words                                                                                                                             |
| Two faults put back to test the tests "were not caught": nothing was printed                                    | Each left a variable unused, the game did not build, and no test ran                                                              | Written again so that the game built. Both were caught                                                                                             |
| A test said the cards stood at different heights                                                                | The right answer is lifted a few pixels when it is lit                                                                            | It measures the places the cards stand in                                                                                                          |

### What is still wrong or weak

**Unverified, and the most important**

- **Nobody has heard any of it.** 68 new recordings and 25 made again. A recogniser heard each as the right
  words; that is all that is known.
- **Where a word is cut into beats has been checked by nothing.** The recogniser hears the word before the
  breaths go in, because with them it hears three short words or none. So of "el, e, phant" it is known that
  it is "elephant", and not that the cuts fall where a person would put them. The rule is simple (one consonant
  between two beats goes with the second, of two the first stays behind) and gives "a, pple" and "um, brel, la".
- **Whether the clap, the lit place and the finger come when the sound does.** The moments are the
  synthesiser's own account of its speech, except the first of a word, which is where the silence ends. They
  were tested for being in order and inside the clip. They were never set against the sound by ear.
- **Whether a synthesised voice can teach rhyme at all.** Rhyme is in the vowel. The recogniser heard this
  voice's "hut" as "hot" and its "tin" as "ten" when each was cut out alone, and "cot" as "caught". A child is
  asked to tell "pot, cot" from "pot, hat".
- **"th".** One word starts with it, "thumb", and its first sound drawn out is a quiet hiss. "Moth" and "path"
  end with it.
- **Whether one showing teaches what "rhymes" means,** or what a card of claps is for, or what the three places
  are. Each is shown once by Glim, and "rhyme" is said in so many words only there.
- **Whether the pictures of two things say "on" and "in".** A hen in a hut stands in its doorway; a rat in a
  cup looks out over the rim; a cat in a pan lies in a pan seen from above, and is small. They read to me.
- **No teacher has read the order, the words or the wrong answers.** Rhyme and beats before any letter; three
  pairs and those three; "a" as a word, which is the first thing here that does not sound as its letter was
  taught and is not remarked on. And the voice is American while "cot" is drawn as a British one: a child in
  the United States calls that a crib, and may call the shop a store.

**Weak, and known**

- **Nothing shows that a child can read a word they have not met.** Every word that is read has a picture that
  has been seen and named. The brief's last step (P6) is not built. A child could know "ship" from its shape.
- **Every sentence has one shape.** "A … on a …", "a … in a …", twelve times. The pictures beside the right one
  differ in the first word, the last word or the little word, or are the same two things the other way round,
  so each word has to be read; but there is no verb, no "the", and nothing longer.
- **A word is built from exactly its own three letters.** Nothing is left over, so the third letter places
  itself, and there is no word with a pair of letters to build.
- **Beats are answered by choosing, not by clapping.** Nothing listens, on purpose, and nothing counts taps.
  Thirteen words, of one, two or three beats.
- **On the flattest phone held sideways print is small**: 13 pixels for a small letter, in a word and in a
  sentence alike. It can be read by an adult.
- **A letter tile stands on a card**, a frame inside a frame, wherever letters are things to press.
- Sixteen cards are a long page for a small child. Play goes to the next one; the page does not group them.
- The voice telling the page what it says is there for the tests. Nothing in the game uses it.
- 552 recordings is a long list for one person to listen through, and it is still the only check that counts.

## Phase 06, second half (2026-11-25): numerals, order, and adding in Number Garden

### Summary

Number Garden had seven activities and no numeral anywhere. It has eighteen. The eleven new ones go on from
where the seven stopped: amounts in order (a staircase of towers with one missing), the pairs that make five
and ten (a frame with some places full), then numerals — a group and its numeral both ways about, zero as an
empty frame, a number that is said, the numbers in order on a path of stones — and last adding and taking away,
as stories in which some come or some go.

All eleven are questions with choices, played on the board the first activity is played on. What is new is
what they are asked with: six kinds of picture, drawn here, and the numerals themselves, which are drawn stroke
by stroke like the letters and are not a font. And one rule that runs through all of them: **a wrong answer is
answered by counting it.** A wrong numeral shows its own amount as dots, the dots are counted, and its name is
said. That is the part most worth a teacher's eye, and the part I can least judge.

### How it was made, which bears on how far to trust it

In one working tree, by one hand, straight after the Music Lab. The content is 142 challenges written as rows
of tables; rules that work each answer out from its picture, not from what the table says, refuse a row that is
wrong, and every rule is shown to fire. The pictures were looked at in the running build at five screen sizes
on contact sheets, changed, and looked at again. The browser tests that passed first time were made to fail by
putting each fault back; **two of them passed with the fault in**, and were rewritten until they did not.

### The review

Looked at in the running production build at 390×844, 844×390, 640×256 and 320×568:
`docs/review/number-garden/`, 21 pictures. 1 = poor, 3 = acceptable, 5 = excellent.

| Category             | The eleven | Why                                                                                                                                                                                                                              |
| -------------------- | :--------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |     4      | One picture asked about, two or three to answer with. A story reads from left to right: those who stay, a gap, those who come or go. Towers to choose from stand side by side on one ground. A tall phone leaves air above them. |
| Craft and materials  |    3.5     | The numerals are drawn in the same hand as the letters, and are good. Blocks, frames and stones are plain shapes with a line of shading. The lines in the air beside someone on the move are three dashes: clear, and crude.     |
| Cohesive palette     |     4      | The garden's green and its things. Sun yellow is kept for one meaning: what the answer put there — the tower in the gap, the number on the bare stone, the apples that filled the frame.                                         |
| Liveliness           |    3.5     | Things hop as they are counted; those who come slide in from the edge of the picture; those who go step away and fade; a step of the stairs lifts as its note plays. Between questions nothing moves.                            |
| Interface legibility |     4      | Everything pressed is 56 points or more on the three tightest screens, measured. What is counted is 30 pixels or more across on phones held upright; on the flattest phone held sideways it is 20 to 28, which is small (below). |
| Motion quality       |     4      | Every movement is the story or the counting, never decoration. With motion reduced a story stands as it ends and its question is still said. Seen in a browser, not on a device.                                                 |
| The sound            |     —      | **Not rated.** Nobody has heard a number said.                                                                                                                                                                                   |
| Child comprehension  |     —      | **Not rated.** No child has seen it.                                                                                                                                                                                             |

Measured, in pixels, in headless Chromium:

| What is counted or read                  | 320×568 | 390×844 | 844×390 | 640×256 |
| ---------------------------------------- | :-----: | :-----: | :-----: | :-----: |
| One of six in a story                    |   34    |   41    |   38    |   28    |
| An apple in a frame of ten (asked about) |   30    |   38    |   35    |   21    |
| An apple in a frame of ten (to choose)   |   28    |   37    |   32    |   20    |
| A block of the staircase (across, high)  | 41, 20  | 72, 36  | 72, 36  | 28, 14  |
| A block of a tower to choose from        | 47, 24  | 83, 42  | 51, 25  | 20, 10  |
| A stone of the path                      |   58    |   71    |   77    |   56    |
| A numeral to choose from (how high)      |   49    |   91    |   112   |   48    |

### Seen — cause — fix

| Seen                                                                                                                    | Cause                                                                                                  | Fix                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| An empty frame, answered rightly with 0, filled itself with ten apples                                                  | A frame is filled in when its answer is found, and that was done whatever it had been asked            | Only a frame that asked "how many more?" is filled in. Zero stays empty                                                                    |
| The test written for that passed with the fault put back                                                                | It looked at the frame the moment the answer was taken, before the board had got as far as lighting it | It waits until the frame and its numeral are lit together, and then looks                                                                  |
| A numeral's dots jumped up into the numeral as they were counted                                                        | The hop is sized for a picture of a group; in a numeral's drawing the same hop is three times as far   | A dot hops a little way, and swells                                                                                                        |
| Two frogs in a story were 35 pixels across in a box that had room for 80; on a phone held sideways, 18                  | Every story was drawn in one picture sized for ten of them                                             | Everyone is drawn one size, and the picture is cut to who is in it. Sideways, a story has about half the width                             |
| Towers to choose from lay in wide, short cards on a phone, with blocks 15 pixels high                                   | Choices are stacked on a narrow screen, which suits wide pictures                                      | Towers stand side by side on every screen: 42 pixels a block on that phone                                                                 |
| A story was drawn, for one frame, already over, before it was told                                                      | A board is at rest until its script's first moment, and a story at rest is its ending                  | A script that shows something at its very start is shown that way from the first frame                                                     |
| Before that: the finished story stood for the two and a half seconds its question took to say, and was then taken apart | The telling came after the words                                                                       | The story opens as it stood before anyone moved, and they come as the words are said: "Here come some more."                               |
| The recogniser heard "some more calm"                                                                                   | "Some more come." ends on a word the synthesiser swallows                                              | "Here come some more."                                                                                                                     |
| The apples in a frame of ten to choose from were 20 pixels on the narrowest phone                                       | The numeral asked about had a third of the screen                                                      | A numeral that is asked about has the room a sign has: 28 pixels                                                                           |
| With seven staying and three coming, everyone would have been drawn under half size                                     | Three in a line beside four across is seven places                                                     | Beside a wide group, three stand two over one. A test holds every story from 1 and 1 to 9 and 1 to a width a narrow phone can show         |
| Adding up to five asked, on its own, only about three, four and five                                                    | The table had no one-and-one in it                                                                     | It has. A test asks every activity for four different answers and more than one way of asking                                              |
| The test for less movement passed with the story still being told                                                       | It waited for the story to be as it ends, which it also is at the end of its telling                   | It holds the clock from the first moment and sees that nobody is ever taken away                                                           |
| The whole build went over its size budget, 2942 kB of 2900                                                              | 142 challenges written out are 134 kB before compression (8 kB after)                                  | Content has a budget of its own; what is left, the game itself, has a tighter one than before. A world's content is still fetched on entry |

### What is still wrong or weak

**Unverified, and the most important**

- **Nobody has heard a number said.** Eleven number words, each cut from the end of a sentence because the
  synthesiser clips a word said alone, and 37 new lines. A path of stones is walked by saying four of those
  words one after another — "two, three, four, five" — and whether that sounds like counting or like four
  recordings is not known.
- **The numerals are one school's hand.** An open 4, a 7 with no bar through it, a 1 with a small flag, a 9
  with a straight stick. Schools and countries differ, and a child who is taught another 4 will meet two. It is
  one file of strokes (`src/art/numerals.tsx`).
- **Whether the pictures say what they are meant to say.** That a staircase of blocks is "one more each time";
  that someone faded is someone gone; that three dashes are movement; that an empty frame is none. Each seems
  plain to an adult who already knows.
- **Whether counting a wrong answer helps.** It is the idea the whole of this rests on. It also takes time: a
  wrong 8 for a 9 is seventeen things counted. The child can answer again without waiting, and whether they
  wait is not known.
- **No teacher has read the order, the questions or the wrong answers.** The wrong answers are chosen to be the
  ones a child would give for a reason — the ones who were there first, the places already full, a 6 for a 9 —
  and each is written down with its reason. That is my reading of what is written about early number, not
  anyone's experience of a classroom.

**Weak, and known**

- **On the flattest phones held sideways the things to count are 20 to 28 pixels across.** A screen 256 pixels
  high has about 100 for the board once the bar and Glim have theirs. They can be counted; they are small.
- **No sum is written anywhere.** No +, no −, no =. The stories stop where a number sentence would begin.
- **Each story has one shape.** Some come, from the right; some go, the last ones. Never "how many came?", never
  two groups compared, never a story told only in words.
- **The pairs that make five and ten are only chosen, not made.** A child picks the group that fills the frame;
  nothing is split in two by hand, and nothing is put into the frame one at a time.
- **Ten is a 1 and a 0 side by side** and nothing says why.
- **Giving out a number that is written is not built**: the two giving games stop before numerals.
- _Hear a number_ cannot be played with the sound off, by its nature, and says so.
- Eighteen cards are a long page for a small child. Play goes to the next one; the page does not group them.
- The world's content is now 177 kB before compression, by far the largest: every challenge is written out in
  full, with its choices, its hints and why each wrong answer is tempting.

## Phase 11 (2026-11-25): the Music Lab

### Summary

There is a seventh place to go: the lighthouse, which is now a music room. It has six activities, in the order
its brief sets out, and a room for playing in with no questions at all. Two of its games are new kinds — a beat
to tap along with, and a tune to make up to a shape, which is the first thing in the game with many right
answers. Its sounds are not recordings: every note is made by arithmetic at the moment it is played.

**That last sentence is the whole of the risk.** A recording that is wrong is wrong the same way every time and
can be listened to once. These sounds were never listened to at all: not by a person, and not by a machine
either, since there is no recogniser for "does this sound like a chime bar". What was checked is what can be
checked without ears — that the right pitches are asked for at the right moments, at a sensible loudness, on
the audio's own clock. Whether the result is pleasant, or is plainly a scale on a phone's small speaker, is
unknown. It is one function of numbers to change (`strokeOf`), and it wants a person with a phone.

### How it was made, which bears on how far to trust it

In one working tree, by one hand, looked at in a browser on five screen sizes as each board was built, and
again at the end. Unlike two of the six worlds, all of its code was written and read here. Its tests were
written with it, and the ones that passed first time were then made to fail (`docs/TEST_RESULTS.md` has the
list). It was built quickly, in one sitting, straight after the fixes of the pull request before.

### The review

Looked at in the running production build at 390×844, 844×390, 640×256, 320×568 and 1366×768:
`docs/review/music-lab/`. 1 = poor, 3 = acceptable, 5 = excellent.

| Category             | The Music Lab | Why                                                                                                                                                                                                             |
| -------------------- | :-----------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |       4       | One board, one thing to do. The drum is the size of the screen's shorter side; bars stand in a row, lowest first. A question that is only listened to leaves a tall phone with two large cards and little else. |
| Craft and materials  |      3.5      | The same paper, lips and radii as the rest. The drawings are plain: a bar is a rounded rectangle with two pins, a bird is a ball with a beak. Clear, consistent, and no more than that.                         |
| Cohesive palette     |       4       | A pink role of its own, checked for contrast. The bars are a rainbow, as real chime bars are: seven more colours on one screen than anywhere else in the game, and each means a note.                           |
| Liveliness           |      3.5      | A bird opens its beak and rings come off it; a bar dips when struck; the beat runs along its lights and pulses on the drum's rim. Nothing else moves, and nothing dances.                                       |
| Interface legibility |       4       | Every control is 56 points or more on the three tightest screens, measured (`e2e/sizes.spec.ts`), and so is everything in the room to play in (after a fault CI found there: `docs/TEST_RESULTS.md`).           |
| Motion quality       |       4       | Everything is a response to a sound. With motion reduced the lights go on and off and nothing travels. Seen in a browser, not on a device.                                                                      |
| The sound            |       —       | **Not rated.** Nobody has heard it.                                                                                                                                                                             |
| Child comprehension  |       —       | **Not rated.** No child has seen it.                                                                                                                                                                            |

### Seen — cause — fix

| Seen                                                                                                              | Cause                                                                                                                                                                                              | Fix                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A seventh island would have been 71 pixels wide on the smallest phones held sideways, and every island smaller    | Seven places already stand in one row there                                                                                                                                                        | The Music Lab is in the lighthouse, which stood in the middle of every arrangement and did nothing      |
| "Explorer Harbor" cut short on phones held sideways                                                               | The lighthouse, moved back to make room for its own name, stood level with the two far islands, and its name left theirs no room                                                                   | Set a little nearer; a unit test holds the three names' room                                            |
| _High and low_ was a strip 20 pixels high on the narrowest phone held sideways                                    | Not the Music Lab's fault: a question that is only a sign kept two rows as well as two columns. **Number Garden's three comparing activities had been drawn that way, live, since the six worlds** | Fixed for every world; a sweep now measures everything a child presses on the three tightest screens    |
| The same sweep: Memory Forest's cards to pick out were 49 pixels high on the narrowest phone sideways (also live) | Two rows of cards in a board a hundred pixels high                                                                                                                                                 | One row there, with the width given to whichever half is in use: the things to remember, then the cards |
| The drum was 60 pixels across on the narrowest phone sideways                                                     | The beat's lights stood over it                                                                                                                                                                    | Beside it, on very flat screens; the drum has the board's whole height                                  |
| The drawing of a tune being made was 40 pixels high there                                                         | Its two tools stood under it                                                                                                                                                                       | Under the sign instead                                                                                  |
| Six bars were 47 pixels each on a screen 320 points wide                                                          | Six is one too many                                                                                                                                                                                | No activity has more than five bars; a content rule refuses a sixth                                     |
| The beat was marked "miss", "early" and "late" in the page, though nothing drew them                              | The board wrote every mark it was given                                                                                                                                                            | Only a beat that was met is marked, anywhere                                                            |
| A drum that is not quite a circle                                                                                 | A width from the screen and a height from the room it had                                                                                                                                          | The room is measured (a container query), and the drum is the largest circle that fits                  |
| The recogniser heard "it is to go up first"                                                                       | "It has to go up first, and then come down." is a mouthful for the synthesiser                                                                                                                     | "Go up first. Then come down."                                                                          |
| A tune being made kept what was chosen before the answer was shown, so following Glim's hand led to a wrong tune  | Reasoned, not seen: the hand shows one way, and the child's first notes may belong to another                                                                                                      | Showing a way starts the tune afresh                                                                    |
| Two birds on an activity's card were 22 pixels each                                                               | Each had a box of its own in a card 70 pixels wide                                                                                                                                                 | On a card the two are one small drawing                                                                 |
| A test tapped the drum late on a brisk beat and failed, in a way no child's fault                                 | It waited to see each light and then pressed, which is late by however long a press takes                                                                                                          | It keeps the beat as a person does: from the first beats, each tap begun a little ahead                 |

### What is still wrong or weak

**Unverified, and the most important**

- **Nobody has heard it.** Above.
- **The allowance for keeping the beat is a guess.** A quarter of a beat either way after a steady lateness has
  been taken off, six beats of eight. It was chosen from what is written about how young children tap and from
  sums: taps at about the right pace and at random moments pass perhaps one time in ten. Whether a
  four-year-old who is plainly in time passes every time has not been tried, and that is the direction it must
  not fail in.
- **How late a real phone's sound is, and how late its touch,** have not been measured on one. The allowance is
  for exactly that, and is capped at a third of a beat: a Bluetooth speaker that is later than that will make
  every tap late.
- **Whether "high" and "low" are learnt from a small bar and a long bar** is a hope. The words are a figure of
  speech a child has to be taught, and the game teaches them only by showing which bar is which.
- **A third apart may be too close** for the youngest. It is the last and hardest of the questions, and a
  child who cannot do it still finishes: the right one is shown after a wrong try.

**Weak, and known**

- The drawings are plain (above), and the lighthouse's chime bars are a few pixels on the map: what says
  "music" there is two notes drifting up, which a three-year-old may not read as anything.
- Where the places stand in one row the lighthouse has no name written under it.
- On a phone held upright, and on the narrowest phones held sideways, the room's bars stand in two rows of
  four: a keyboard broken in half. (They were eight in a row sideways, 47 to 53 points wide, until CI's
  iPhone-sized screen showed it. In a row they are now never under 56.)
- Three activities are close cousins — two tunes the same or different, a tune found again — and a child may
  feel they are one game three times.
- A question that is listened to cannot be hurried: a tune and three more to compare it with is eight seconds
  before anything can be tapped.
- Nothing a child makes is kept: a tune is played back once and is gone.
- No rhythm is tapped back, only a steady beat; there are no black keys; the five other rooms the brief
  describes are a list on a page.

## Phases 04 to 10 (2026-11-23): six worlds and a voice

### Summary

Every island now has something to do, and the game talks. There are 39 activities, of eleven kinds: choosing a
picture, giving an amount, picking things out, repeating an order, finding pairs, putting a story in order,
steering a robot, mending a row of steps, guessing what will happen, mending a thing on a bench, and answering on
a map. Each is shown first, then tried with help at hand, then tried alone.

It is a first pass through each world, not a finished one. Two things matter more than everything below them.
**The voice is a synthesiser's, and nobody has heard it**; in a world that teaches sounds that is not a detail.
And **the activities have been played only by tests and by me**: every one can be finished, every answer is
checked to be the one right answer, and whether any of them teaches a four-year-old anything is not known.

### How it was made, which bears on how far to trust it

Number Garden's new activities, Reading Cove, Memory Forest and Explorer Harbor were written in one working
tree, looked at in a browser at several sizes as they were built, and changed where they looked or behaved
wrong. Robot Ridge and Inventor Island were written at the same time by two agents working in copies of the
repository, to a brief and to the same frame. Their reports were read, their commits merged, their tests run
with everything else, and a few of their screens looked at. **Their code was not read line by line**, and their
worlds have had less of a second pair of eyes than the other four.

### The review

Looked at in the running production build at 390×844, 640×256 and 1366×768, as each board was built; and
captured again at the end at 390×844 and 844×390: `docs/review/worlds/`, 57 pictures. 1 = poor,
3 = acceptable, 5 = excellent.

| Category             | Reading Cove | Number Garden | Robot Ridge | Memory Forest | Inventor Island | Explorer Harbor | Why                                                                                                                                                                                        |
| -------------------- | :----------: | :-----------: | :---------: | :-----------: | :-------------: | :-------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Composition          |      4       |       4       |      4      |       4       |        4        |       3.5       | One board, one thing to do. A map is a fixed shape and leaves a tall phone half empty; so, less so, does the robot's ground.                                                               |
| Craft and materials  |     3.5      |       4       |      4      |      3.5      |        4        |       3.5       | The same paper, lips and radii as Phase 03. The pictures are plain flat drawings, clear and consistent, and no more than that: 57 in the kit, 37 for stories, each world's own besides.    |
| Cohesive palette     |      4       |      4.5      |      4      |       4       |        4        |        4        | Sun is still "this way". The story pictures bring their own skies and grounds, which is more colour on one screen than anywhere else.                                                      |
| Liveliness           |     3.5      |       4       |      4      |      3.5      |        4        |       3.5       | Things hop when counted, a robot drives, a bridge sags, a boat sails. A picture that is named lifts; a story told back lifts each picture in turn. There are no page turns and no scenery. |
| Interface legibility |      4       |      4.5      |      4      |       4       |        4        |        4        | Every control a child presses is 56 points or more on every screen tested, down to 640×256, where a map is only 170 points wide and its three places are a third of it each.               |
| Motion quality       |      4       |       4       |      4      |       4       |        4        |        4        | One thing moves at a time, and everything works with motion reduced. Seen in a browser at speed; not on a device.                                                                          |
| The voice            |      —       |       —       |      —      |       —       |        —        |        —        | **Not rated.** Nobody has listened.                                                                                                                                                        |
| Child comprehension  |      —       |       —       |      —      |       —       |        —        |        —        | **Not rated.** No child has seen it.                                                                                                                                                       |

Nothing here is rated 5, and the ratings for Robot Ridge and Inventor Island rest on fewer screens than the others.

### Seen — cause — fix

| Seen                                                                                                                                                                                     | Cause                                                                                                                                  | Fix                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| After one recording failed to download, that line was never said again in the visit                                                                                                      | A failed download was remembered the same way as a file that could not be decoded                                                      | Only a file that will not decode is remembered; a failed download is tried again                                                                                                                 |
| The cards to answer with could be seen while the things to remember were still on show                                                                                                   | The board drew both at once                                                                                                            | Cards are blank until what was shown is put away                                                                                                                                                 |
| What was "covered" could be read from the page by any tool                                                                                                                               | It was hidden by a style, and still in the page                                                                                        | What is covered is not rendered at all; tests look for it and must not find it                                                                                                                   |
| Asking to be told again uncovered a group that was to be taken in at a glance                                                                                                            | "Again" replayed the whole showing                                                                                                     | It says the words again and uncovers nothing; another look is help                                                                                                                               |
| The button that turns the sound on could not be pressed by a test, and jumped under a finger                                                                                             | It pulsed, and so was never still                                                                                                      | A still button with a pulsing ring behind it                                                                                                                                                     |
| On the flattest phone the things to repeat ran off the screen                                                                                                                            | A rule that centred a list also let it grow                                                                                            | Only the marks are centred                                                                                                                                                                       |
| A picture made its card taller than the screen                                                                                                                                           | A square picture set the height of the card it was in                                                                                  | Every card is one cell that the picture is fitted into                                                                                                                                           |
| On the flattest phone a place on a map was 41 points across                                                                                                                              | A place was a fixed share of the map, and the map there is 170 points wide                                                             | A place is never under 56 points, and every map was made again with places a third of a map apart                                                                                                |
| On the flattest phone the three pictures of a story were 34 points each                                                                                                                  | A question got a third of the width whatever it held                                                                                   | A strip of three pictures gets as much room as its three answers                                                                                                                                 |
| "That is the whole story" was written under a story before it had been told                                                                                                              | What is said of a right answer is shown at once, and the telling came after                                                            | The line is "Yes. Here is the whole story.", said first; then the story, each picture with its line                                                                                              |
| On a tall phone a story's pictures were small in tall empty cards                                                                                                                        | Two rows each took half the screen                                                                                                     | A card is no taller than a picture needs; the two rows keep together                                                                                                                             |
| At 640×256 the parts on a workbench were 50 points high (found by the agent's own test)                                                                                                  | Two rows of parts                                                                                                                      | Under 300 points of height the parts stand in one row                                                                                                                                            |
| On a world's page held sideways, the line under its name failed the contrast check                                                                                                       | It shrinks there to a size at which the world's colour is too pale                                                                     | In ink at that size. Found by an agent's check; no test ran that page sideways, and one does now                                                                                                 |
| The grown-ups' list of skills was 44 lines with no order to them                                                                                                                         | One list for every world                                                                                                               | Grouped under each world's name                                                                                                                                                                  |
| In a question where things are looked at and then hidden, the choices could be tapped before anything had been shown, and what would be asked was already standing in front of the cover | The board had one state for "not yet looked at" and "looked at and covered", and while the voice said "Look who has what" it was in it | Until the look has happened the choices are turned away and what will be asked is held back. Found because a WebKit test in CI passed only at its second attempt: its tap had fallen in that gap |
| Lines were heard by the recogniser as other words: eight in the last three worlds made ("chick" as "check", "sagged" as "sad")                                                           | A synthesiser's pronunciation, or the recogniser's ear: there is no telling which without listening                                    | Each was reworded until it was heard as written. "Nut" could not be, and is no longer a word to learn                                                                                            |

### After they went live (2026-11-25)

The six worlds were merged and deployed on 2026-11-23. Two things done afterwards found faults that the review
above and 656 browser tests had not: rehearsing an update in a browser that already had the game, and reading a
CI run that had passed with four of its tests needing a second attempt. All five are fixed in the pull request
after #6, each with a test that fails on the code as it was. Until that is merged they are on the live site.

| Seen                                                                                                                                                                                                                    | Cause                                                                                                                                                                      | Fix                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| After one tap on Glim, nothing was shown first for the rest of the activity: a group to glance at stayed covered, an order was never lit, a pattern of sounds was never played, and the question was asked all the same | Asking again was remembered by the board, and a board stays on the screen from step to step. Every later step was taken for a second telling, which leaves the showing out | It is kept by step, like everything else a board remembers                                    |
| A tap on Glim while the words before a look were being said, or in the middle of a look or of an order, took the look or the order away for that step                                                                   | "Again" meant "leave out the showing", whether or not there had been one                                                                                                   | An asking that comes before the showing is over starts the step again, with the showing in it |
| While an order was being shown, a card could be tapped in the pause after each light, and before the first                                                                                                              | The cards were closed only while one of them was lit                                                                                                                       | They are closed from the moment the question arrives until the last light has gone out        |
| A world's page that was loaded again, or that a phone had brought back, showed nothing as finished, and Play went back to the first activity                                                                            | The page shows what the player has finished and never asked who the player was; the map had always asked before it                                                         | Whatever shows what is finished asks who is playing, if nobody has                            |
| The place to take one back was a different button each time the board counted                                                                                                                                           | The button was made afresh so that the counting would start from the first thing                                                                                           | What hops is made afresh, inside a button that stays where it is                              |

**What this says about the review above.** The first of these is the kind of fault a child finds in a minute:
children tap the character. No test had tapped Glim and then gone on to the next step, and I had not either.
Nearly every test plays one step as if it were the first, in a browser that has never seen the game, on one
build. Everything in this table needed two of something: a tap in one step and a look in the next, a page opened
a second time, one build and then another. There are probably more faults of that shape, and only some were
looked for.

### What is still wrong or weak

1. **Nobody has listened to the voice.** 395 recordings by one synthesised American voice. A recogniser heard
   each as its words (13 single words only inside a sentence). Whether it sounds kind, clear and right to a child
   is unknown, and for Reading Cove it is the whole lesson.
2. **Reading Cove teaches no sound on its own.** A letter is met through two key words with their first sound
   drawn out. That was chosen because a synthesiser cannot be trusted to say /s/ or /t/ alone, and a wrong model
   is worse than none. It is not how most phonics teaching goes, and a reading teacher may well want it changed.
3. **Reading Cove cannot be played without sound.** It says so and offers to turn it on. A child who cannot hear
   has five worlds, not six.
4. **No child and no teacher has seen any of it.**
5. **The pictures are plain.** They are consistent and nothing in them can be miscounted or misread that I could
   see, but they are simple flat drawings made quickly, and a few are thin (a dry path is mostly sky). The
   briefs ask for illustration of a higher order than this.
6. **A story is told back by lifting its pictures.** The brief asked for a storybook with page turns.
7. **A tall phone is half empty on a map**, and on the robot's ground: both keep their shape and are as wide as
   the screen. Nothing was drawn to fill the rest.
8. **On the flattest phone a map is very small** (170 by 110 points). Its places can be pressed; whether they can
   be read is another matter.
9. **An activity soon repeats.** A sitting draws three or four challenges from a pool of five to eight.
10. **Robot Ridge and Inventor Island have been looked at less** (above).
11. **The toy models are toys.** A bridge holds or sags by a table. Nothing says so to the grown-up except the
    activity's note; the limits are comments in `src/engine/models.ts`.
12. **A world's page is long on a phone**: Reading Cove has ten activities, each a card.
13. **There is no way to turn the voice off and keep the other sounds**, no volume, and no choice of voice.
14. **The recordings are fetched when first wanted.** The first sitting of an activity needs a connection for
    its lines; after that the service worker has them. A line that arrives too late is not said.
15. **Glim points at the next thing not yet finished, and nothing is locked.** A child can open blending before
    hearing a first sound. Whether that matters is for someone who has watched a child.
16. **The tests mostly try one step, one visit and one build at a time** (above). An update is now rehearsed
    before a release, and a few tests carry something from one step into the next; most still do not.
17. Everything in Phase 03's list below that is not about the voice or the number of worlds still stands.

## Phase 03 (2026-11-23): the journey in, and the activity

### Summary

A visit now has a beginning, a middle and an end. It opens on a front door where a child says who is playing by
tapping a picture; the map behind it comes alive; one island leads, through a page that shows what is done there,
into an activity that Glim demonstrates, helps with, and ends calmly; and the way out is the way home at any point.
The activity screen, which Phase 02 left below 4 in most categories, is now the same paper-on-water world as the
rest.

What this phase could not do is put it on a phone. The requirement added for it — that it work on Android and iOS
devices on a Vercel deployment — was met as far as code, emulation and reasoning go, and no further: see _Phones_,
below. A second look, made after this report was first written, found three faults that the emulated devices had
passed and that a child with a real phone would have met in the first minute. They are fixed, and are in _A
second look, with a phone in mind_.

### The review

Captured from the running production build with `npm run screens` at 390×844, 844×390, 768×1024, 1366×768 and
360×740, and at 750×342 (what Safari leaves a page on an iPhone held sideways): rated, changed, captured and rated
again. Six pictures of round one are in `docs/review/phase-03/round-1/`; round two is 85 pictures in
`docs/review/phase-03/`, among them 21 click maps and three tooltips. The second look added 16 beside them (two
more click maps, and fourteen whose names begin `phones-`), and three of how things were before it in
`phones-before/`.

Round two (round one in brackets where it differs). 1 = poor, 3 = acceptable, 5 = excellent.

| Category             | Front door | Activity | World page | Why                                                                                                                                                                             |
| -------------------- | :--------: | :------: | :--------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |     4      |    4     |     4      | One card in front of the map; one board with one thing to do; the place, what it is for, and one way in. On a wide screen the activity's cards are still larger than they need. |
| Craft and materials  |     4      | 4 (3.5)  |     4      | The same paper, lips and radii everywhere. The activity had an empty gradient behind it; it now has two pale hills in the world's colour.                                       |
| Cohesive palette     |    4.5     |   4.5    |    4.5     | Sun is still only "this way": the answer, the way on, "carry on", Play.                                                                                                         |
| Depth and lighting   |     4      | 3.5 (3)  |    3.5     | The door has the map behind a veil. The activity is flat on purpose — nothing to count but the things — with the lips, the hills and Glim's glow for depth.                     |
| Liveliness           |     4      |    4     |    3.5     | Glim waves, counts, points, celebrates; things hop when counted; flowers come up at the end. The world page is a still page with one fade.                                      |
| Interface legibility |    4.5     |   4.5    |     4      | Every child's control is 56 pixels or more on every screen (click maps). The world page still carries a good deal of text for the grown-up below the first screen.              |
| Motion quality       |     4      | 4 (3.5)  |     4      | One thing moves at a time. In round one a wrong choice wobbled twice and a demonstration gave its answer away early. Seen in a browser at speed; not on a device.               |
| Child comprehension  |     —      |    —     |     —      | **Not rated.** No child has seen it.                                                                                                                                            |
| Device performance   |     —      |    —     |     —      | **Not rated.** These screens are light (no 3D), but nothing here has run on a device.                                                                                           |

Below 4, and why it was left there: **depth** on the activity and the world page, and **liveliness** on the world
page. The activity is flat because anything else on that screen competes with the things being counted; the world
page is a signpost with one job. Both are choices, and both would change if a child's eye turned out to wander.

### Seen — cause — fix

| Seen                                                                                     | Cause                                                                                                    | Fix                                                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| On a sideways phone, Glim was drawn in the middle of the front door's pictures           | The card's own rule made Glim's box unpositioned, and its drawing is laid out inside that box            | The box stays positioned                                                                                     |
| The pictures' shadows were cut off along a straight line                                 | The list scrolls when there are many players, and a scrolling box clips                                  | Room for the shadows inside the box                                                                          |
| The example of the activity lay over the Play button                                     | A height in per cent, measured against a row whose height came from its contents                         | A row of exactly the room's height                                                                           |
| On a sideways phone Play was below the first screen                                      | The example added a row above it                                                                         | The place on the left, the way in on the right                                                               |
| A wrong choice wobbled twice: when tapped, and again after being counted                 | "Set aside" was applied at once, lifted for the counting, and applied again                              | It is held, with a dashed edge, until it has been counted; then set aside once                               |
| A demonstration lit its answer before reaching it                                        | The engine says the answer is shown for the whole of a demonstration; the screen showed it for the whole | The screen waits for the script to reach it                                                                  |
| _Click map:_ "carry on" was 72 pixels on a sideways phone                                | The default size of a large round button outranked the size it was given                                 | The rule outranks the default; it is 84                                                                      |
| _Click map:_ the way home in the top bar was 44 pixels high on a sideways phone          | The bar is shorter there and the link was shortened with it                                              | 48, which still fits                                                                                         |
| The front door showed the last player's name tag behind its veil                         | The tag was part of the map                                                                              | It appears once the child has said who is playing                                                            |
| The activity's background was an empty gradient                                          | Phase 01's frame, never revisited                                                                        | Two pale hills in the world's colour, low and still                                                          |
| _Accessibility check:_ soft text failed contrast on a world page, but only sometimes     | The check ran while the page was still fading in, and measured the fade                                  | The checks wait for a page to finish arriving (`arrived()`)                                                  |
| _Journey test:_ a front-door picture measured 57 pixels on a sideways Pixel              | It was measured while popping in; it is 68                                                               | The test measures after arrival. (A fault in the test, not the page.)                                        |
| _Storage test:_ with all storage refused, the map could not be reached                   | Nothing can remember that the visit has begun, so the front door is met on every load — as it should be  | The test goes through the door, which is now what that case checks                                           |
| _Layout arithmetic:_ on a sideways phone with its bars showing, islands fill 0.89        | Name tags have a smallest size and take a little more of a very short screen                             | The check allows 0.88 there, and says why. Tap areas are 102 pixels or more on every one of eighteen screens |
| _Reading the code with a phone in mind:_ the first sound of a visit would never be heard | A phone's audio takes a moment to wake, and a cue asked for in that moment was dropped                   | The cue waits for the wake, up to 0.9 seconds. **Reasoned and unit-tested; not heard on a phone.**           |

### A second look, with a phone in mind

The devices named in the browser tests are a screen size, a pixel ratio, touch and a user agent on a desktop
engine. After the documents for this phase were written I went through the new screens again, asking what a phone
does that those profiles do not. It has a notch. Its browser keeps bars of its own, so a page gets much less of a
sideways screen than the size of the screen suggests. And the hand on it has more than one finger. Each of the
three hid a fault. None could be seen with the profiles, so each was put to the page another way, and that way is
now a test that fails on the code as it was.

| Seen                                                                                                                                                            | Cause                                                                                                                                                                                                                                                              | Fix                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **With a thumb resting anywhere on the screen, nothing a child tapped did anything**                                                                            | A browser answers a tap only while it is the one finger on the screen. Sent through Chromium's own touch handling, which Chrome on Android shares, a tap beside a resting finger — or one during which another finger lands — produces no click at all, every time | A short press that begins and ends on one thing while another finger is down is answered once, with the click the browser did not make (`src/app/touch.ts`). One finger alone is left to the browser. **Shown in Chromium; not tried on a phone, and not at all on iOS** |
| **On a common Android phone held sideways the islands were 70 pixels wide, their tap areas overlapped and their names ran into one another** (`phones-before/`) | Such a phone is 360 pixels high that way round, and its status bar and Chrome's own bar leave a page about 264 to 280 of them — not the 342 to 360 the profiles have. The game's bar takes 52 more, and the low ring of islands is three rows deep                 | On a very flat screen the seven places stand side by side in one row, Glim moored in front of the lighthouse: islands 101 pixels wide at 800×264 and 81 at 640×256, none touching, and a name that does not fit on a line takes two                                      |
| **On an iPhone held sideways a world's page had its way back, its picture and its example under the margin the notch needs**, by 35 pixels                      | The reading pages were centred between the gutters alone. The top bar, the map and the activity already kept clear                                                                                                                                                 | A page's side margin is the gutter and the worse of the two notch margins (`--side`)                                                                                                                                                                                     |
| _Reading the stylesheet:_ the page could bounce, and a pull could reload it, in a browser that takes that from the root element                                 | It was declared on the body only; the specification's own example puts it on the root                                                                                                                                                                              | Declared on both                                                                                                                                                                                                                                                         |
| _Reading the stylesheet:_ two quick taps between things could zoom the page                                                                                     | Only buttons and links declined a double-tap zoom                                                                                                                                                                                                                  | The whole page declines it. Two fingers still zoom                                                                                                                                                                                                                       |
| **On the flattest screens the end of an activity lay under the way home and ran 28 pixels past the bottom**                                                     | Its card kept the wide margins and the large picture of a taller screen                                                                                                                                                                                            | Below 320 pixels of height it gives them up. The browser test of a flat screen now plays an activity to its end                                                                                                                                                          |
| _Knowing what a phone does with a long press:_ a slow, hard press — a small child's — would get no answer                                                       | A phone's browser takes a press held for more than about four tenths of a second for a long press, and answers that with a menu of its own or with nothing: never a click. A browser on a desk does click, so this could not be seen to fail here                  | A press of up to a second that ends where it began is answered in the same way as a tap made beside a resting finger. **Unit-tested only; not seen on a phone either way**                                                                                               |

The profile of an iPhone held sideways (750×342) was itself part of why the third was missed. It is the part of
the screen _inside_ the notch's margins, which is what a page gets that has asked for nothing more. This game
asks for the whole screen, so on the phone it is 844 wide and is told to keep 47 pixels clear at each end. The
tests now give a page those margins, through the four custom properties every rule reads them from.

What the second look could not settle is in _What is still wrong or weak_, items 2 to 5.

### Phones: what was done, and what only a phone can tell

| Done in this phase                                                                                                             | How it was checked                                                                                                                                                         | What only a device can tell                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The first tap of a visit is on the front door, and its sound waits for the audio to wake                                       | Unit tests on the audio engine with a context that wakes late                                                                                                              | Whether the hello is heard on an iPhone and on an Android phone                                                                                                                          |
| While sound is on, Safari is asked to treat the game as media, so the ring/silent switch does not mute it                      | A unit test that the request is made, and survives a browser that refuses it                                                                                               | Whether an iPhone on silent plays the sounds; whether that is what a family wants                                                                                                        |
| Coming back from another app meets the pause sheet, whose tap wakes the audio again                                            | Read from the code; pausing itself is tested in a browser                                                                                                                  | Whether sound returns after a call or a switch of apps                                                                                                                                   |
| A resting finger selects nothing, gets no iOS call-out, and opens no Android menu                                              | Unit tests on the guard; the styles are read, not tested                                                                                                                   | All of it. A long press on an island and on a picture in an activity, on both systems                                                                                                    |
| Every screen fits what a phone's browser really leaves a page, upright and sideways                                            | Twenty-five screens by arithmetic, seven of them phones held sideways as they really are; browser tests as a Pixel 7, an iPhone 13 and an iPad, and at 800×264 and 640×256 | What height a given phone really leaves; the toolbar that comes and goes; rotation                                                                                                       |
| Every screen keeps clear of a notch and a home bar                                                                             | A browser test on all twelve projects, with the margins given to the page through the properties its rules read them from                                                  | Whether a phone's margins are those; a Dynamic Island; the phone turned the other way                                                                                                    |
| A tap counts while another finger rests on the screen, and so does a slow press                                                | Eighteen unit tests; a browser test that sends two-finger sequences and a slow press through Chromium's own touch handling                                                 | Everything on iOS: whether Safari ignores such a tap, and whether this answers it there. A palm. Whether a phone really leaves a slow press unanswered, and whether this then answers it |
| On a very flat screen the map is one row of islands                                                                            | Arithmetic; browser tests at two sizes: size, nothing touching, names whole, Play and the first question on the first screen                                               | How it sits in a hand                                                                                                                                                                    |
| The page does not bounce, reload on a pull, or zoom on two quick taps                                                          | The declarations are read back in a browser test                                                                                                                           | All of it: these are gestures, and no test here makes them                                                                                                                               |
| A browser too old to run the game says so after eight seconds, instead of showing nothing                                      | Read from the page; not tested in an old browser                                                                                                                           | What an old iPad actually shows                                                                                                                                                          |
| Nothing new needs the network, a login or a key; the Vercel configuration is unchanged from the one tested in Phases 01 and 02 | The same header, routing and service-worker tests as before                                                                                                                | A deployment. **Nothing has been deployed.**                                                                                                                                             |

The emulated devices are the right screen, pixel ratio, touch and user agent on desktop engines. They found one
real thing (Play below the first screen on a sideways phone). They could not find the three faults of the second
look, and nothing here can find anything about sound or a GPU.

### What is still wrong or weak

1. **No phone or tablet has run it.** Everything in the right-hand column above.
2. **The answer to a tap made beside a resting finger has only been shown in Chromium.** If Safari on an iPhone
   ignores such taps as well, the same code should answer them, and it is written so that it can only add a click
   where the browser gave none. Neither half of that sentence has been tried on an iPhone.
3. **The answer to a slow press has never met the fault it answers.** A press held for more than about four
   tenths of a second is a long press to a phone's browser, which then makes no click when the finger lifts.
   Chromium on a desk does click, so the fault could not be reproduced here and its answer could only be
   unit-tested. A press held for more than a second still does nothing, on purpose: that is a finger resting.
4. **On the narrowest phones held sideways an island is under 96 pixels wide**: 81 by 103 at 640×256, and 90 by
   112 on an iPhone 13 mini. Seven places do not fit side by side any larger. Everywhere else it is 96 or more.
5. **Two fingers can still zoom the page**, on purpose: anyone who needs it larger can have it. A small child's
   two fingers can therefore zoom the map by accident, and must pinch it back. Whether to forbid that on the map
   and in an activity is for someone who has watched a child use it; it is one rule in the stylesheet.
6. **No child has seen it.** Whether a four-year-old taps a picture at the door, finds the island with the sun
   tag, watches the demonstration, and knows that Glim will show it again, is untested.
7. **Glim still has no voice.** "Show me again" replays what was shown and its notes. An instruction in words exists
   only as the caption for the grown-up. Phase 04.
8. **One activity, in one world.** The frame is built for every world and has been used by one.
9. **Travelling is a fade.** Tapping an island still does not take the child there; the page arrives softly and
   shows the same island. A journey across the water was not built.
10. **On a wide screen the activity's cards are bigger than their pictures need.** Legible; not handsome.
11. **The world page is mostly for the grown-up.** For the child it is one picture and one sun button, which is
    enough, but everything below the first screen is text.
12. **Leaving the tab pauses the activity.** Right for a phone; on a desktop, coming back to a "Paused" sheet
    after glancing at another tab may be more than was wanted.
13. **A browser test that follows a 3D test still waits for it in CI** (up to 44.5 of its 60 seconds, in Phase
    02's runs). Not fixed in this phase; `docs/PROGRESS.md` → _Known gaps_.
14. **Twice in CI a page load in WebKit has waited a whole minute**, and passed at once at its second attempt. It
    is not explained. A test that runs out of time now reports what it was still waiting for
    (`docs/TEST_RESULTS.md` → _Continuous integration_).
15. **In a row, the map has no boats, rocks or clouds.** The islands take the whole width; the sea still moves.
16. Everything in Phase 02's list below that is about the hub still stands.

## Phase 02 (2026-11-22): the home screen

## Summary

The home screen is now the game's own world rather than a menu over a placeholder: a lighthouse and six modelled
islands in a moving sea, each island a button, with a guide who points the way. It is one picture in two forms —
real-time 3D, and images rendered from the same models — placed by the same arithmetic, so the fallback is the same
hub and not a lesser one.

By the nine-category rubric of `prompt-series/02_PREMIUM_ART_DIRECTION.md`, the home screen reaches 4 or more in
every category that can honestly be rated here. **Three categories cannot be**: motion quality in 3D (it has only
been seen at two to four frames a second, in software), device performance (no graphics hardware) and child
comprehension (no child). The activity screen was not this phase's subject and is still below 4 in several; it
belongs to Phase 03.

## The art review

Screens were captured from the running production build at 390×844, 844×390, 768×1024, 1366×768 and 360×740
(`npm run screens`), rated, changed, captured again and rated again. Round one is kept in
`docs/review/phase-02/round-1/`; round two is `docs/review/phase-02/`.

### Home screen, 3D (1 = poor, 3 = acceptable, 5 = excellent)

| Category             | Round 1 | Round 2 | 390×844 | 844×390 | 768×1024 | 1366×768 | 360×740 | Why (round 2)                                                                                                                                 |
| -------------------- | :-----: | :-----: | :-----: | :-----: | :------: | :------: | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |    4    |    4    |   4.5   |    4    |    4     |   4.5    |    4    | One arrangement per screen shape; the lighthouse leads the eye; the guide sits by the open island. Sideways phone: islands are small.         |
| Craft and materials  |   3.5   |    4    |    4    |    4    |    4     |    4     |    4    | Rounded, gradient-painted, brush-textured models with dressed ground. Still simple forms; the stones in the sea are plain.                    |
| Cohesive palette     |    4    |   4.5   |   4.5   |   4.5   |   4.5    |   4.5    |   4.5   | Eight roles throughout; each island and its name tag wear the island's colour; sun-yellow only where it means "this way".                     |
| Depth and lighting   |   3.5   |    4    |    4    |    4    |    4     |    4     |    4    | One warm sun, cool shade, soft shadows, contact shade, haze, paler water far away, a vignette. By design no gloss and no ambient occlusion.   |
| Liveliness           |   3.5   |    4    |    4    |    4    |    4     |    4     |    4    | Water, wind, a turning mill, a waving robot, boats, gulls, clouds and their shadows, a guide who answers a tap. Islands react only by rising. |
| Interface legibility |    4    |   4.5   |   4.5   |    4    |   4.5    |   4.5    |   4.5   | The island is the button; names never cut short or covered; one island stands out. Sideways phone: 12-pixel names.                            |
| Motion quality       |    ?    |    ?    |    ?    |    ?    |    ?     |    ?     |    ?    | **Not rated.** See below.                                                                                                                     |
| Child comprehension  |    ?    |    ?    |    ?    |    ?    |    ?     |    ?     |    ?    | **Not rated.** No child has seen it.                                                                                                          |
| Device performance   |    ?    |    ?    |    ?    |    ?    |    ?     |    ?     |    ?    | **Not rated.** No graphics hardware. See _Performance_.                                                                                       |

### Other screens (round 2)

| Category             | Home, as a picture | Home, 3D, low tier | Activity | Why                                                                                                                                               |
| -------------------- | :----------------: | :----------------: | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |         4          |         4          |    3     | The picture and the low tier are the same layout. The activity is the Phase 01 frame: large empty cards on a wide screen.                         |
| Craft and materials  |         4          |        3.5         |    3     | The picture is the 3D render. The low tier has coarser curves and plainer water. Counting pictures are plain single shapes, on purpose.           |
| Cohesive palette     |        4.5         |        4.5         |    4     | The same.                                                                                                                                         |
| Depth and lighting   |         4          |        3.5         |   2.5    | The picture has the shadows painted in. The low tier has painted contact shade only. The activity is flat.                                        |
| Liveliness           |      **3.5**       |         4          |    3     | In the picture, boats bob, clouds and wave marks drift, the guide moves — but the islands themselves are still. The activity has the guide.       |
| Interface legibility |        4.5         |        4.5         |    4     | The same links and names in all three hubs.                                                                                                       |
| Motion quality       |         4          |         ?          |   3.5    | The picture's motion and the guide's are CSS and were seen at full speed: calm, purposeful, stopped by calm motion. No change-of-page transition. |

**Below 4, and why it was left there**

- **The picture's liveliness (3.5).** Its islands are still images. Moving parts of them would mean a second picture
  per island or a sprite sheet; that was judged not worth 150 kB more on the first screen for a fallback. It is the
  first thing to revisit if real devices turn out to get the picture more often than expected.
- **The low tier (3.5 for craft and depth).** That is what a tier is for. Nothing a child needs is missing from it.
- **The activity screen.** Phase 02 gave it the guide and nothing else. Its frame, its pictures and its transitions
  are Phase 03's "first complete vertical slice".

**Why motion in 3D is not rated.** A still picture says nothing about motion, and the only moving 3D seen here was
drawn by a software renderer at two to four frames a second. What can be said: every moving thing was watched and
does what it is meant to (frame-by-frame captures; a browser test checks that the scene changes gently and holds
still under calm motion); nothing moves the camera; the periods and distances are those in `docs/ART_DIRECTION.md`.
Whether it is _smooth_ on a real device is unknown.

### Seen — cause — fix

What looking at the screenshots found, in the order it was found. Rounds one and two of the review are the last
eight rows; the rest were found on the way to round one.

| Seen                                                                             | Cause                                                                         | Fix                                                                                                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| The sea was covered in glints, like static                                       | Fine grain thresholded at a high frequency                                    | Glints from two slow layers sliding past each other: lens-shaped, in drifting shoals                          |
| Vertical seams in the water                                                      | The brush texture's streak channel did not tile                               | Noise with its own period on each axis                                                                        |
| Grey-brown ground round the lighthouse                                           | Too little flat top, too much cliff, and contact shade mixed towards grey     | A wider top, less cliff; contact shade darkens the ground's own colour                                        |
| The robot's eyes were slits; doors and windows were fatter than drawn            | The rounded block grew by its bevel on every side                             | A block now measures what it is asked to                                                                      |
| Stones looked like cut gems                                                      | A faceted solid among soft shapes                                             | A lumpy ball with smooth shading                                                                              |
| Sunflowers and a flag cut off; landmarks could reach into a neighbour's tap area | The room given to a landmark ignored how far back on its island it stands     | Room is measured as drawn on screen; a test measures every model, through the motion of its moving parts      |
| Names cut short on a sideways phone ("Inventor Isla…")                           | One type size; a name no wider than its island                                | Type sized from the islands; a name may overhang its island but never the screen; a test at five sizes        |
| Clouds like grey boulders, one of them over an island                            | Too big, too shaded, placed by eye                                            | Smaller, self-lit, placed by the layout's arithmetic, with tests that nothing floats over an island or a name |
| A white ring round every boat                                                    | The water treated a boat as an island                                         | Floating things get faint foam and no shallows                                                                |
| In an activity on a phone, the caption was squeezed to two words a line          | Guide, caption and a worded button in one row                                 | Under 480 pixels the way on is a round arrow; its words stay for screen readers                               |
| The guide's states looked alike; a pointing arm vanished against the body        | Short arms, no hands                                                          | Mittens, an arm that reaches, a pose for each state, lifted brows for the gentle retry                        |
| The guide's sparkles all in one corner                                           | An animated CSS transform replaced the position given in the drawing          | Each spark sits in its own positioned group                                                                   |
| An error on the console, sometimes, when the 3D code could not be downloaded     | A lazily loaded component throwing while React rendered                       | The 3D code is fetched by hand; a failure is a value, and the hub keeps its picture                           |
| The lighthouse missing from one capture of the picture                           | The screenshot was taken while that image was still being decoded             | Captures and tests wait for every picture to be decoded and drawn                                             |
| Keyboard: the first Tab reached the guide, not an island                         | The guide came first in the page                                              | The guide comes after the islands                                                                             |
| _Round 1:_ surfaces flat at the size the islands are seen (craft 3.5)            | Brushwork too faint; ground one even green                                    | Stronger wash; clumps of light and shade; a darker line where turf meets sand; tufts, pebbles, starfish       |
| _Round 1:_ little moving but the water (liveliness 3.5)                          | No creatures; sparse wave marks                                               | Gulls that beat and glide; buoys; more wave marks; pools of sunlight; in the picture, drifting wave marks     |
| _Round 1:_ the sea the same in every corner (depth 3.5)                          | Nothing gathered the eye                                                      | A vignette and a little haze at the far edge, over 3D and picture alike                                       |
| _Round 1:_ every name tag alike (palette 4)                                      | Grey badges                                                                   | Each badge in its island's colour                                                                             |
| _Round 1:_ the guide small on a wide screen                                      | Two units across                                                              | A fifth larger                                                                                                |
| _Round 2:_ the picture hub kept a quarter of a processor core busy               | Twenty small animations, each stepping in its own time                        | Everything that never stops moves on one shared half-second beat: 24% of a core became 14%                    |
| _Round 2:_ software-rendered 3D at two frames a second                           | Water shaded under the islands; fine curves and rich water on the lowest tier | Water drawn last; the lowest tier cuts curves coarser and drops the water's decoration: twice the frame rate  |
| _Round 2:_ island meshes kept every corner three times over                      | Shapes merged without shared vertices                                         | Corners stored once: 5.3 MB of vertex data instead of 12.5 MB                                                 |

## What is still wrong or weak

1. **It has never been drawn by a graphics card.** Everything about the 3D hub's speed is inference (see
   _Performance_).
2. **No child has seen it.** Whether a four-year-old reads a moon as "asleep", sees that the island is the button,
   or notices the guide pointing, is untested. The sunny name tag and the pointing guide are two signals for "start
   here"; nobody knows yet whether either works.
3. **Five of the six islands are closed.** They are finished to look at and lead to a page that says so.
4. **A phone held sideways gets small islands** (about 105 pixels across) and a top bar a seventh of the screen
   high. Everything is legible and tappable; it is the least generous of the five layouts.
5. **The picture's islands do not move** (rated above).
6. **No transition between screens.** Tapping an island cuts to its page. The page now shows the same island, which
   helps; a journey there is Phase 03's.
7. **The activity screen is Phase 01's**, with the guide added. The world emblems (a ladybird, an owl…) were drawn
   before the islands and no longer match them; one still appears when an activity ends.
8. **The guide has no voice** and the name "Glim" has not been checked for prior use.
9. **Shapes are simple.** This is a style, but also a ceiling: there are no characters living on the islands apart
   from two faces, and nothing on an island answers a tap except by rising.
10. **Sound is eight synthesised motifs.** No voice, no ambience.
11. **The pictures are rendered at 80 pixels to the unit.** On a large high-density screen they are slightly soft.
12. **The focus ring is a heavy rounded rectangle** round the whole island. Clear; not pretty.

## What Phase 01 listed, and where it stands now

| Phase 01 said                                       | Now                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| The island is placeholder geometry                  | Seven modelled, painted islands                                              |
| The six worlds are not on the island                | Each world is an island, and the island is the link                          |
| Upright phone: empty sea                            | Stepping stones to the lighthouse; the screen is full                        |
| Five of six tiles are closed                        | Still five closed. They look alive rather than shut; the open one stands out |
| The two hubs are different pictures                 | One picture in two forms; a browser test checks they agree                   |
| The low tier is flat                                | Contact shade is painted into the ground on every tier                       |
| The group to match is drawn larger than the choices | Unchanged (Phase 03)                                                         |
| The caption under an activity is text               | Now the guide's speech bubble; still no voice (Phase 04)                     |
| Emblems and icons are not a family                  | Unchanged, and now further from the islands' style                           |
| Sound is six blips                                  | Eight, as named motifs                                                       |
| 53–98 draw calls for 30–54 thousand triangles       | 24–35 draw calls for about 105 thousand (47–50 thousand on the low tier)     |
| No real-device performance data                     | Still none                                                                   |
| No visual regression tests                          | Still none; one test compares picture and 3D at the islands' middles         |

## Performance

### Sizes

From `npm run verify:dist`, which enforces the budgets (gzip, except where noted):

| What                                   | Size     | Budget | Phase 01 |
| -------------------------------------- | -------- | ------ | -------- |
| Script needed for the first screen     | 98.6 kB  | 110 kB | 93.9 kB  |
| Styles needed for the first screen     | 6.2 kB   | 12 kB  | 4.8 kB   |
| Fonts (two variable fonts, Latin)      | 67.2 kB  | 80 kB  | 67.2 kB  |
| The hub's pictures (WebP, as they are) | 283 kB   | 330 kB | —        |
| 3D hub code, fetched afterwards        | 259.7 kB | 290 kB | 244.3 kB |
| Largest other on-demand part           | 5.8 kB   | 30 kB  | 5.7 kB   |
| Whole build, uncompressed              | 1.78 MB  | 2.6 MB | 1.43 MB  |

The first screen is heavier than it was by the pictures: 283 kB of images that arrive after the page is usable and
are then kept. The 3D code is never in the first load (the verifier follows the entry's imports and fails the build
if it is), and is never fetched at all on a device without WebGL or with graphics set to pictures only.

### What the 3D scene costs

From `npm run measure:hub` against the production build. Draw calls, triangles and what the renderer holds are
properties of the scene and do not depend on the machine:

| Screen            | Tier   | Draw calls | Triangles | Geometries | Textures | Shader programs | Pixel ratio |
| ----------------- | ------ | ---------- | --------- | ---------- | -------- | --------------- | ----------- |
| desktop 1366×768  | low    | 26         | 49,672    | 24         | 1        | 2               | 1           |
| desktop 1366×768  | medium | 32         | 105,510   | 27         | 3        | 3               | 1           |
| desktop 1366×768  | high   | 35         | 107,186   | 27         | 3        | 3               | 1           |
| phone 390×844 @3× | low    | 24         | 46,852    | 23         | 1        | 2               | 1           |
| phone 390×844 @3× | medium | 30         | 102,690   | 26         | 3        | 3               | 1.5         |
| phone 390×844 @3× | high   | 33         | 104,366   | 26         | 3        | 3               | 2           |

Against the ceilings this phase set itself: **under 40 draw calls** (each island is one; Phase 01 had 53–98), **under
160,000 triangles** (a unit test holds each island under 40,000), **three textures at most** (the brush, and two
for the shadow map), **three shader programs** (paint, water, shadow). Shadows are drawn once and kept, so an ordinary
frame has no shadow pass. All vertex data is 5.3 MB (2.4 MB on the low tier).

**Frame rate: measured only in software, and it is poor.** SwiftShader, a CPU rasteriser on four cores, draws the
scene at 2 to 4 frames a second on the medium and high tiers and 3 to 8 on the low tier — slower than Phase 01's
scene (8 to 27), because every pixel of the screen now runs a real water shader. This says very little about a
graphics card, which is built for exactly that work, and by a graphics card's standards the scene is light. But it
is not evidence either way. What follows from it:

- On "automatic", a device whose only WebGL is a software one **keeps the picture** (unchanged from Phase 01, and
  now more important).
- The tier thresholds in `src/render/quality.ts` are still guesses. On automatic the pixel ratio steps down by
  itself if frames are slow; that has never been seen working on real hardware.
- **The first thing to do with a real phone is open the home screen and read Grown-ups → Diagnostics → Frames.**

### What a screen costs while nobody is touching it

CPU time of all browser processes over five seconds with the page left alone, from `npm run measure:idle`
(headless Chromium, software rendering; 100% means one core fully busy):

| Screen                           | Size     | CPU while idle | Phase 01 |
| -------------------------------- | -------- | -------------- | -------- |
| Home, as a picture               | 1366×768 | 14%            | 10%      |
| Home, as a picture               | 390×844  | 7%             | 6%       |
| Home, as a picture, calm motion  | 1366×768 | 0%             | 0%       |
| A world's front page             | 1366×768 | 0%             | 8%       |
| The activity                     | 1366×768 | 7%             | 6%       |
| The grown-ups gate               | 1366×768 | 0%             | 0%       |
| Home, 3D, low tier (software 3D) | 1366×768 | 358%           | 349%     |

The picture hub was at 24% before its motion was put on one beat (see the log above). What is left is the price of
redrawing a full screen of layered images twice a second in software; with a graphics card compositing, it should
be near nothing. The guide costs about three points of it.

### What was not measured

- Frame rate, frame-time stability, memory use, heat or battery on any real device.
- Load time on a real network. (The test server is on the same machine.)
- How long the 3D scene takes to build on a slow phone: seven islands are sculpted on the main thread when the 3D
  code arrives. It is quick here; it has not been timed on a phone.
- Lighthouse or Web Vitals in the field. The game records paint and layout-shift timings on the device for the
  grown-ups' diagnostics panel, and sends them nowhere.

## How this was checked

| Check                                             | By                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tap areas: size, no overlap, nothing covering     | Unit tests on the layout for ten screen shapes; browser tests that hit-test five points on every island  |
| Every model inside its room; triangle budgets     | Unit tests that measure each model, following its moving parts                                           |
| Picture and 3D in the same places                 | A browser test comparing the two at every island's middle                                                |
| Names never cut short or off the screen           | Browser test, five screen shapes                                                                         |
| Colour contrast, names, roles                     | axe-core in the browser tests; ratios in `docs/ART_DIRECTION.md` computed from the palette               |
| The 3D scene really draws, moves, and holds still | Tests that decode screenshots: many colours, paler water far away, gentle change, none under calm motion |
| The guide says the right thing at the right time  | A browser test through a whole activity                                                                  |
| Assets listed and licensed; no hot links          | Unit tests on the manifest and on every shipped file                                                     |
| Composition, taste, clarity                       | By eye, from the screenshots in `docs/review/phase-02/`, two rated rounds                                |

## For Phase 03

The hub can carry more than it does: islands that answer a tap with something of their own, a journey to the island
rather than a cut, the guide speaking. The activity screen is where the look is weakest now; the kit, the palette
and the guide are there to bring it up to the hub. And before any of that, if a phone or a tablet is to hand: open
it, and read the frame rate.
