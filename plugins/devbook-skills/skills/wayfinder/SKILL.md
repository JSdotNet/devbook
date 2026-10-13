---
name: wayfinder
description: 'Plan an effort too big for one session as a map on the issue tracker — a wayfinder:map issue naming the destination, decision tickets as blocking child issues — then resolve one frontier ticket per session. Plans and decides; never builds the destination. Use when: an idea is too big or foggy for one session, or to take the next ticket on a map ("/wayfinder").'
disable-model-invocation: true
---

# Wayfinder

Open the reply with `devbook-skills@<version>`, `version` read from `../../.claude-plugin/plugin.json`, not recalled.

A ticket resolves a decision, not a slice of the build; the map is done when nothing is left to
decide. The pull to just do the work means you reached the map's edge — stop and say so,
unless the map's Notes carry execution into it. The shapes, labels, and tracker operations
are in [map.md](map.md); read it first. Refer to every map and ticket by its title, the link
inside the name, never by a bare number. Resolve one ticket per session; research tickets are
the exception.

## Chart the map

Invoked with a loose idea.

1. **Destination.** Grill until the spec, decision, or change this effort ends in is one or
   two lines. It fixes the scope.
2. **Frontier.** Grill breadth-first across the whole space for the open decisions. No fog —
   the way is already clear and fits one session — means no map: stop and ask how to proceed.
3. **Map.** Create the `wayfinder:map` issue: Destination and Notes filled, Decisions so far
   empty, the fog sketched under Not yet specified.
4. **Tickets.** Create every ticket you can state precisely now as a child issue, then wire
   blocking in a second pass. What you cannot yet phrase stays fog.
5. **Research.** Resolve each `research` ticket in a background agent where the host has one.
6. Stop. Charting resolves no other ticket.

## Work the map

Invoked with a map, and a ticket optionally.

1. Load the map body only; fetch a ticket body when you need it.
2. Take the named ticket, else the first frontier ticket. Claim it — assign it — before any work.
3. Resolve it by its type; use whatever skills the map's Notes name.
4. Post the answer as a resolution comment, close the ticket, and add its line to Decisions so far.
5. Create the tickets the answer surfaced and wire them; graduate fog it made specifiable and
   delete that patch. A ticket past the destination is closed and listed under Out of scope.
   Update or close any ticket the answer invalidated.

Other sessions may work unblocked tickets at the same time: re-read before editing the map.
