# To do

- FIRST
    - Join Room
        - Enter your name before other fields are visible
        - If two teams are already created, CTAs are "Join [team 1]" and "Join [team 2]"
        - Otherwise, CTA next to text field updated in real time: "Join [team name]"

- Bugs
    - No Available Categories
        - If all custom categories used and no universal categories available, game should detect this and either end early or...?

- Playtest notes
    - mobile view should show everything without scrolling (or, auto-scroll to top of page when switching game state)
    - Sound/haptics when timer is running down
    - Option to have AI make up the entries in your category for you

- Backlog
    - Data store cleanup in prod when a room has been created: can it be reset/renamed/deleted?
    - Game restart
        - ALL custom categories can be reused if the user joins a different room
        - Allow users to delete unused custom categories
    - Design refinements
        - Make the color scheme less monochromatic
    - Accessibility refinements
        - Keyboard navigation to select a team during onboarding
    - UX improvements
        - Onboarding
            - Used categories should be collapsed by default and shown below unused categories
            - Player/team order can be shuffled/reordered

        - If the next Announcer is offline when starting a turn, automatically skip to next player on the team
        - Icons for revealed entries after guessing
            - Not guessed: X
            - Guessed via form: Green checkmark
            - Guessed via Announcer toggle: Green ear or speaker to indicate an audible guess
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
- 9/11 6hrs
- 9/14 2hrs
- 9/20 2hrs
