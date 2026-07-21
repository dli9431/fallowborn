# Contributing

Thanks for playing Fallowborn and wanting to make it better.

## Bug reports and ideas — yes, please

Open a GitHub issue for anything: bugs, balance complaints, quality-of-life ideas,
confusing UI, events that read wrong. For bugs, include your browser and device (the
game targets old hardware on purpose — "it's slow on my 2012 phone" is a valid report)
and what you were doing when it happened. Use reactions (👍) on existing issues to vote
— it genuinely affects what gets worked on next.

## Code pull requests — not accepted

This is a policy, not a judgment of your code. Fallowborn's source is public under the
[PolyForm Noncommercial License](LICENSE), while the game is also distributed
commercially by its author — a model that only works while the codebase has a single
copyright holder. Merging outside code would break that, so pull requests are disabled
on this repository. If this ever changes, it will involve a contributor license agreement
and this file will say so.

The fastest way to get a change made is a well-argued issue: describe the problem, and
if you've read the code, point at the lines.

## Mods — the encouraged way to build on the game

Everything about the world is data: provinces, realms, cultures, events, traits,
balance. You can create and share complete mods — up to total conversions — as JSON,
imported at runtime from the Mods menu without touching a single engine file. Your mods
are your own work, to share however you like. See [docs/MODDING.md](docs/MODDING.md)
for the full schema reference.
