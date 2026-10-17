# Game choices

The homepage and the game client show Zork 1, 2, and 3 directly. A homepage
choice opens the surrounding world with `?game=zork1&start=1` (or `zork2` /
`zork3`); the frame forwards that choice to Lantern. Starting creates one real
server session. Opening the game without a choice shows the menu. Failed starts
leave the choices available with the server error. The old looping demonstration
has been removed.

| ID | Title | Server story file |
| --- | --- | --- |
| `zork1` | Zork I: The Great Underground Empire | `zork1-r119-s880429.z3` |
| `zork2` | Zork II: The Wizard of Frobozz | `zork2-r63-s860811.z3` |
| `zork3` | Zork III: The Dungeon Master | `zork3-r25-s860811.z3` |

The short menu lines follow the preserved
[Infocom download page](https://infocom-if.org/downloads/downloads.html).
The Zork II line is also printed on the
[original manual cover](https://www.digitpress.com/library/manuals/c64/zork2.pdf).
Titles/subtitles can be checked against the original story headings and
[the preserved packaging](https://gallery.guetech.org/).

## Additional games

Microsoft/Activision released the source for Zork I–III under MIT in November
2025. The [official announcement](https://opensource.microsoft.com/blog/2025/11/20/preserving-code-that-shaped-generations-zork-i-ii-and-iii-go-open-source/)
links to the canonical source and license files and describes the exclusions
for packaging, trademarks, and other materials. The launcher does not copy box
art or add more story binaries.

The deployed server configuration currently names these three Z-machine story
files and runs `dfrotz`. An additional title needs a compatible compiled story,
an explicit redistribution license for that particular game/version, and an
installed file plus server configuration. Availability in a download archive,
or an open-source interpreter, does not establish the game's license.

Glulx uses a different virtual machine. The author's
[Quixe implementation](https://eblong.com/zarf/glulx/quixe/) can run Glulx stories
in a browser, but it would be a separate engine integration. This change keeps
the working Frotz backend and exposes all three currently configured games.

`tests/lantern-menu.test.mjs` checks the homepage choices, each selected session,
unsupported links, returning to the menu, and errors without creating real
server sessions. `zorkmid-world.test.mjs` checks that the world forwards the
selected game and keeps the same iframe mounted across other views.
