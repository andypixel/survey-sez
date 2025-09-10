# To do

- FIRST
    - Continue Gameplay view UI refinements:
        - Validate side-by-side Category/Room Summary layout with all views

- MVP
    - Team view should only use unused categories for count under players' names
    - Do a few trial runs seeing what kind of categories/entries Q can come up with; after giving it a few rounds of feedback, have it generate ~50 categories and save to the database (do this again just before "launch")
    - Design refinements
        - Onboarding
            - Start page
                - Global template
                - Game name
            - Join Room
                - Replace radio button / "create new team" / input field with input field only
            - Game configuration
                - Global template
                - Game name
                - Entry list text entry
        - Gameplay
        - Game over
    - Logo + other graphical flourishes?
    - Provision database for production build
    - Hosting
    - Smoke test on mobile device
    - Data store cleanup in prod when a room has been created: can it be reset/renamed/deleted?
    - Do a few trial runs seeing what kind of categories/entries Q can come up with; after giving it a few rounds of feedback, have it generate ~50 categories and save to the database

- Bugs
    - If user closes browser window during guessing, then returns, timer starts over (should stay in sync with other sessions). How should the source of truth for the timer be defined?
    - No Available Categories
        - If all custom categories used and no universal categories available, game should detect this and either end early

- Backlog
    - Game restart
        - ALL custom categories can be reused if the user joins a different room
    - Design refinements
        - Make the color scheme less monochromatic
    - Accessibility refinements
        - Keyboard navigation to select a team during onboarding
    - UX improvements
        - Onboarding
            - Used categories should be collapsed by default and shown below unused categories
            - Player/team order can be shuffled/reordered
    - Game config settings should be synced across all sessions in real time when edited by anyone (or should they? what's the best UX?)
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
- 9/4 2hrs
- 9/5 3hrs
- 9/7 1hr
- 9/8 3hrs