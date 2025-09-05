# To do

- MVP
    - ✅ Team summary component during gameplay: team names, player names, number of custom categories each
    - Provision database for production build
    - Hosting
    - ✅ What if someone drops while they are the announcer, or the announcer role moves to them but they are not online?
        - ✅ "Skip this announcer" button
    - ✅ Don't allow single Player Teams
    - ✅ Timer Desync Issues
    - Design refinements
    - ✅ Emergency reset button
        - Returns all players to ONBOARDING; maintains all unused categories
    - ✅ Prevent duplicate entries for custom categories
    - ✅ Add validation to prevent duplicate team names or player names in any one room
    - ✅ Game restart
        - ✅ Unused custom categories can be reused in this room
    - ✅ Add "dev mode" to only auto-populate entries in that env
    - bug: timeout fails when skipping announcer

- Bugs
    - If user closes browser window during guessing, then returns, timer starts over (should stay in sync with other sessions). How should the source of truth for the timer be defined?
    - No Available Categories
        - If all custom categories used and no universal categories available, game should detect this and either end early

- Backlog
    - Game restart
        - ALL custom categories can be reused if the user joins a different room
    - Design refinements
    - Spectating team also gets to guess using their own text input
        - Guesses from all spectating players are shown to the spectating team only
        - Spectators' guesses are shown to all players during TURN_SUMMARY phase
        - Option to steal points? Half-points? Hmm
            - Would have to be exact matches, which might incentivize players to use non-standard spellings when creating their entries since they can award "close enough" points to their own team
            - Or there could be discussion during that phase, with the specatating team convincing the Announcer to award them points; "Next turn" button is only available to spectating team so Announcer is beholden to their petitions
    - Edge cases
        - If a user specifies a name in one room, then tries to join a different room where a different player also has the same name, joining the room will fail, but silently. Need a mechanism to allow the user to change their name or equivalent

# Time spent
- 8/10 2hrs
- 8/18 3hrs
- 8/23 3hrs
- 8/25 2.5hrs
- 9/1 2hrs
- 9/4 