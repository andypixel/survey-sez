# App Lifecycle Requirements

## Overview
The app lifecycle is split into three main phases for each "game". All mechanisms are scoped to a single room; the only thing shared between rooms is the universal list of categories in the data store.

## Phase 1: Onboarding

### Player Management
- Players join the room, selecting a name and team
- New players can join at any time during this phase
- Each room supports exactly **2 teams maximum**
- When a new user joins:
  - If 0 or 1 teams exist: they can join existing team OR create new team
  - If 2 teams exist: they must join one of the existing teams
- **Offline Player Handling**: Player names are stored persistently in team data
  - Players remain visible in team displays even when disconnected
  - Offline players appear grayed out and italicized
  - Player names persist throughout the entire game session

### Category Management
- Players can add custom categories scoped to their **team** (not room-wide)
- Custom categories are only visible to user who created that category
- Universal categories are available to all teams
- No limit on number of custom categories per team

### Game Configuration
- Someone in the room specifies:
  - Time limit in seconds for each "guessing portion" (turn)
  - Number of rounds (_n_) for this game
- Someone in the room clicks button to end Onboarding and begin Gameplay

## Phase 2: Gameplay
Any category, Custom or Universal, is eligible for use in gameplay as long as it has not yet been used in this room.

### Turn Structure
- Turns alternate between teams, making for two turns per round
- One team is "Guessing", the other is "Spectating"
- Each team completes one turn each for the _n_ rounds defined in the Game Configuration step
- Within each team, players take turns being the "Announcer"

### Announcer Role
- First player on Guessing team becomes Announcer
- Announcer is shown a random category from one of the categories they created, or, if no unused categories created by them remain, one of the unused Universal categories
- Announcer sees a "Start Guessing" button
  - If this category is a Universal category, they also see a "Skip" button
  - Announcer can select Skip a maximum of two times per turn
- If Skip: a different Universal category is selected at random.
- If Start Guessing: category details shown to the Announcer and the timer starts

### Turn Begins
- **Announcer**: Sees category title, category details with checkboxes, countdown timer, "End Guessing" button, "Pause/Resume" button, and Guesses chat feed
- **Other Guessing team members**: See category title, countdown timer, Guesses chat feed, "Pause/Resume" button, and Guesses text entry box
- **Spectating team**: See category title, countdown timer, "Pause/Resume" button, and Guesses chat feed only
- **Timer Management**:
  - Countdown timer starts automatically when guessing begins
  - Timer changes color as time runs low (green → yellow → red with pulse)
  - When timer reaches 0, guessing phase automatically ends
- **Pause/Resume Functionality**:
  - Any player can pause the timer during active guessing
  - When paused, all interactions are disabled (guessing, entry marking, "End Guessing")
  - Any player can resume to restore normal gameplay
  - Pause state is synchronized across all players
- Guessing team members submit words via Guesses text entry
- All submitted words appear in real-time in the Guesses chat feed to both teams
- **Correct Guess Tracking**: 
  - Category entries automatically get strikethrough when exactly matched by guesses (case-insensitive)
  - Announcer can manually check/uncheck entries using checkboxes for "close enough" guesses

### Turn Completion
- **Announcer Control**: Announcer can click "End Guessing" at any time to stop guessing phase
- **Automatic End**: Timer automatically ends guessing phase when countdown reaches 0
- **Results Phase**: When guessing ends (via "End Guessing" button or timer expiration):
  - Timer disappears
  - Guesses text entry field removed
  - Category details remain hidden from all players
  - Announcer reads category entries aloud and can mark additional guesses
  - Announcer sees "Reveal" button
- **Summary Phase**: When Announcer clicks Reveal:
  - Category details with marked entries shown to all players
  - **Turn Score Displayed**: Number of correctly guessed entries shown to all players
  - Announcer sees "Next Turn" button
- **Turn Advancement**: When Announcer clicks Next Turn:
  - Turn score is added to the guessing team's running total
  - Next turn begins with new team/announcer
- **Skip Announcer**: Available to all players during category selection phase
  - Advances to next player on current team without changing turns
  - Use case: When announcer is offline or unresponsive
  - Resets turn state and selects new category for new announcer

### Scoring System
- **Turn Score**: Count of category entries marked as correctly guessed (auto-matched + manually marked)
- **Team Totals**: Running score for each team, visible to all players at all times
- **Score Display**: Shows both current turn score (during Results phase) and team running totals

### Round Progression
- Teams alternate being Guessing/Spectating
- Within each team, Announcer role rotates to next player
- Game continues until both teams have completed _n_ turns

## Phase 3: Game Over

### Results Display
- All played categories and responses shown to all players
- Complete game history visible
- Final team scores displayed

### Game Reset
- "Restart" button available to all players
- Clicking Restart returns room to Onboarding phase
- Players remain in their teams
- Any categories (Custom or Universal) that have not yet been played persist and will be available for the next game in this room

## Technical Notes

### Data Scoping
- **Room-scoped**: Game state, teams, players
- **User-scoped**: Custom categories
- **Global**: Universal categories

### State Management
- Game phases: `ONBOARDING` → `GAMEPLAY` → `GAME_OVER`
- Turn phases within GAMEPLAY: `ACTIVE_GUESSING` → `RESULTS` → `TURN_SUMMARY`
- Turn tracking: current team, current announcer, turn/round count
- Timer management: countdown, start/stop controls
- Category selection: random from available pool (always select from user's unused Custom categories before falling back to Universal)

### User Experience
- Different UI screens for each phase
- Role-based views during Gameplay (Announcer vs Guesser vs Spectator)
- Real-time updates for all interactions
- Persistent user sessions across page refreshes