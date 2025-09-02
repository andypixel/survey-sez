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
    - Prevent duplicate entries for custom categories
    - Game restart
        - Unused custom categories can be reused in this room

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

# Time spent
- 8/10 2hrs
- 8/18 3hrs
- 8/23 3hrs
- 8/25 2.5hrs