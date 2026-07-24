# YouTube plan

Working notes for the channel's first video (and follow-ups). Tone throughout: dry,
deadpan, lightly meme-literate. Understatement over hype — let screenshots and numbers
do the jokes.

## Video 1 — the origin-story devlog

**Working title:** "I have 1,800 hours in CK2 and a PC from 2015. So I made my own."

The frame: not a passion project, a *grievance* project. Every feature exists because
something in CK2/CK3 personally wronged the developer. Delivered flat — settling scores,
not celebrating.

### Beat-by-beat

1. **Cold open — the specs.** CK3's minimum requirements on screen next to the real
   machine (GTX 1050 Ti, i5-6600K). Pause. "My CPU came out in 2015. Microsoft says
   it's too old for Windows 11, and Windows 10 support ended in October 2025. This
   computer is, officially, e-waste." (True — Windows 11 requires 8th-gen Intel or
   newer; the 6600K is 6th-gen.)
2. **The hours.** "I've played a *little* bit of CK2" — over the Steam hours-played
   screenshot (1,800+). Don't acknowledge the number verbally; let the screenshot do
   the work and move on mid-sentence. Optional one-liner later: "that's a lot of
   clicking, it turns out."
3. **The late-game lag eulogy.** The CK2 endgame on this hardware, described like a war
   memoir: "By 1400 AD, each month took four seconds. I had time to reflect. Mostly
   about my life choices." Ironman mode: no save-scumming out of the clicking.
4. **The pivot.** "So I did the only reasonable thing: spent [a weekend] prompting AI to build 
   my own grand strategy game. For free. In a browser. Out of spite." Be open that it was
   AI-assisted — transparency neutralizes the comment-section gotcha and fits the
   deadpan register.
5. **The peasant pitch.** "And since I was starting from nothing, so are you. You're a
   serf. In 867. You own dirt. Actually no — the dirt owns *you*." Serf → Emperor
   ladder, generational play, map timelapse of ~65 realms redrawing Europe while your
   family farms.
6. **Grievances → features**, rapid-fire:
   - *Late-game lag* → "It runs in a browser tab. On this PC. The one that can't run
     CK3. That was the point."
   - *The clicking* → automation mode, focuses instead of micromanagement, event-driven
     wars. "I designed this game around the radical premise that my wrist has feelings."
   - *DLC* → "It's free. All of it. There is no 'Serfs & Squalor' expansion pack."
7. **The Roads to Power aside** (preempt the pedants, deadpan): "Yes, CK3 has Roads to
   Power. Yes, you can be landless. You're a dashing adventurer leading a mercenary
   company. In my game you are a tenant farmer. These are different products."
8. **Close.** "It's called Fallowborn, it's on itch, it runs on anything with a
   browser — which, notably, includes my computer." Link.

### Production notes

- Film the game running on the actual 2015 machine and say so on screen ("footage
  captured on the crime scene itself"). Proof + recurring bit + the hardware becomes
  the co-star.
- Put the serf-to-emperor ladder AND "free, browser, on itch" in the first 20 seconds.
  The first is why viewers care, the second is why they click through.
- Flash real event text on screen to sell the game's tone — it's funnier than written
  script jokes. Best candidates found in the data files:
  - "You eat mud to great applause." (events_war.js)
  - "Words fail. Mud is involved." (events_common.js)
  - "Horns. Mud. A line of strangers who mean to kill you…" (events_paths.js)
  - "Your household chews bark-bread and watches the snow." (events_peasant.js)
- The map timelapse (65 realms redrawing Europe over centuries) is the most shareable
  15 seconds — cut it as a Short/teaser too.

### Length & format

- **Target ~6 minutes (5–7 range); do not pad past 8.** The eight deadpan beats, written
  tight, land naturally in that window. Twelve minutes means padding, and padding is fatal
  here.
- **Retention-first, because it's video one.** With no existing audience the algorithm ranks
  on average-view-duration %. A tight 6 min watched to 70% beats a 14 min watched to 30% —
  for both the algorithm and click-through to itch. Do NOT stretch to 8:00 for mid-roll ads:
  video one isn't monetized, and the ad incentive is the classic first-video trap.
- **Format: voiceover over gameplay/screen-capture, no face cam** (self-recorded VO). This
  pushes *shorter*, not longer — no on-camera charisma to carry slow stretches, so every
  second must be a joke landing or game earning its place on screen. That discipline is what
  makes deadpan work. VO + game footage + on-screen event text is the whole show.
- **Use the runtime to disprove "weekend = shallow."** Spend real screen time in beats 5–6 on
  actual depth (map redrawing, succession, event variety) so the *footage* reads as months of
  iteration even while the script jokes about spite. The prototype was a weekend; the game
  wasn't — show, don't claim.
- **Companion Short:** the 15s map timelapse, cut from the same footage — top-of-funnel
  discovery that points back to the main video.

## Title options

Preferred: **"I have 1,800 hours in CK2 and a PC from 2015. So I made my own."**
(The "so I made my own" formula performs; the specificity does the comedy.)

Alternates:
- "My PC can't run CK3, so I made a grand strategy game out of spite"
- "1,800 hours of CK2 gave me wrist pain and a game design document"
- "My CPU is too old for Windows 11. My game runs on it at 60fps."
- "I made a game where you start as a serf. Statistically accurate."
- "Crusader Kings, but you're the guy the kings tax"

Referencing CK3 in the title/tags is fine (nominative use, and it's how the algorithm
finds CK players). Safe shape: "can't run CK3, so I made my own." Avoid phrasings that
position the game AS their product: "free CK3", "CK3 in your browser", "browser
Crusader Kings".

## Thumbnail

**Concept:** Bender meme format ("I'll make my own X"), inverted — the knockoff proudly
promises *downgrades*.

> **FINE. I'LL MAKE MY OWN CK3.**
> *with serfs and barley*

- "serfs and barley" is the pick: reads instantly at small size, both are verifiably in
  the game and verifiably NOT in CK (landless CK3 play starts at nobility; nobody sows
  barley). Bleaker alternate: "with mud and bark-bread".
- Do NOT use the actual Bender image (Disney IP; thumbnail = packaging). Reference the
  format by pose + text only: an original peasant character mid-swagger with a cigar,
  arm raised dismissively. The format is famous enough to carry it.
- Keep "hookers" out of the thumbnail text — thumbnails get stricter automated
  moderation than titles; not worth a limited-ads flag on video one. The meme-literate
  fill in the original line themselves anyway.
- **Workflow:** generate the character in ChatGPT (describe the pose, never say
  "Bender"), generate 3–4 variants and select. Add text manually in an editor (crisp
  text + font control + free A/B on wording). Test legibility at ~120px wide before
  committing.
- Prompt shape: "16:9 illustration. A medieval peasant in a simple flat cartoon style —
  brown tunic, smug expression — strutting away with a confident swagger, smoking a
  cigar, one arm raised dismissively. Muted parchment background with a faint map of
  medieval Europe. Leave the upper third empty."
- Alternate on-brand route (optional): draw the thumbnail procedurally with
  js/portrait.js in a standalone canvas page, so the thumbnail is literally the game's
  art style.

Other thumbnail concepts (bench for later videos):
- Spec sheet, dry text card: "GTX 1050 Ti / i5-6600K / CK3: ✗ / this: ✓" next to the map.
- "YOU ARE THIS GUY": full Europe map, giant red arrow at one muddy county, tiny
  peasant emoji.
- Photo of the actual dusty PC tower with a crown emoji on top.

## Pedant-proofing (learned the hard way)

- **Roads to Power exists.** CK3 landless play = a notable adventurer with a camp and
  retinue, not the bottom of society. The honest angle: "CK3 asks: what if you were a
  landless noble? I asked: what if you were the mud." Address the DLC head-on in the
  video (beat 7) — preempting reads as confident and defuses the comment section.
- **CK already has dysentery** (Reaper's Due disease list). Don't use it as a
  differentiator. Fallowborn currently has pestilence/fever (events_world.js,
  `plague_here` flag) but no dysentery by name. Option: add a dysentery death event
  (~10 lines of event data) for the Oregon Trail double-meme; until then, barley/mud/
  bark-bread are the verified nouns.
- General rule: every comparative claim in title/thumbnail/script gets checked against
  both games first. Grand-strategy viewers relitigate everything.

## Legal / branding guardrails

(Not legal advice; principles are well-established. For a paid launch, one hour with a
games/IP lawyer is cheap.)

- Game mechanics/systems are not protectable; the genre is fair game. What matters:
  don't copy Paradox assets, UI trade dress, icon designs, or event text; keep
  "Crusader Kings"/"CK" out of the GAME's title, store tags, and branding.
- Naming CK for comparison/commentary in videos = nominative fair use, fine even for a
  paid product. Short CK gameplay clips for commentary are standard practice.
- Say **"inspired by," not "clone"** on camera. Courts judge the works, not marketing
  quips, but "I made a clone" is the quote that gets exhibited in a look-and-feel
  dispute — and "clone" undersells what CK doesn't have (commoner ladder, generational
  climb from actual serfdom, runs on anything).
- Thumbnail: the text "CK3" is fine; their logo/key art is not (packaging, not
  commentary).
- If CK is referenced prominently in marketing: one-line "not affiliated with Paradox
  Interactive" is cheap insurance.
- Being open about AI assistance: tag the itch.io AI-generated-content disclosure
  honestly; Steam requires disclosure at submission if the game ever goes there.

## Future video ideas

- **"Rules I gave myself"** — the zero-dependency / ES5 / no-build / emoji-art
  constraints framed as increasingly monk-like vows. "I have taken a vow of no
  node_modules."
- **Narrated first run** — "Can my dynasty go from serf to emperor before I die of
  dysentery (my character, not me)." Every death, plague, and inheritance disaster
  delivered flatly. The generational structure gives a free story arc.
- **The timelapse video** — 65 AI realms redraw Europe for 400 years while your family
  farms the same field. "The world moved on. We did not. Then we did."
- **Budget split** — AAA strategy game budget vs. this ($0), design-decisions tour.
