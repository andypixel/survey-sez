# To do

- MVP
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
    - Input sanitation sweep
    - Provision database for production build
    - Hosting

- Bugs
    - If user closes browser window during guessing, then returns, timer starts over (should stay in sync with other sessions). How should the source of truth for the timer be defined?
    - No Available Categories
        - If all custom categories used and no universal categories available, game should detect this and either end early

- Backlog
    - Game restart
        - ALL custom categories can be reused if the user joins a different room
    - Design refinements
    - Accessibility refinements
        - Keyboard navigation to select a team during onboarding
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