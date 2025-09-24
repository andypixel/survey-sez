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
    - When clicking "I'm done entering categories," Categories form should be disabled
      - Allow players to untoggle "I'm done" if other players are still not done so they can enter more
    - Enable testing WIP branches in production via CI/CD
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

# Architecture & Modernization Recommendations

## Architecture & Code Quality Improvements

### 1. **Implement Proper Error Handling & Logging**
- **Current Issue**: Basic console.log statements and minimal error handling
- **Recommendation**: Add structured logging with different levels (debug, info, warn, error) and proper error boundaries
- **Benefits**: Better debugging, monitoring, and production troubleshooting

#### Current status
- Need to fully code review current diff, make edits as necessary, then push those changes (WIP commit already pushed for production testing)
- Implement error handling in the rest of the app

### 2. **Add Input Validation & Sanitization**
- **Current Issue**: Limited validation on user inputs (category names, player names)
- **Recommendation**: Implement comprehensive validation using libraries like Joi or Yup on both client and server
- **Benefits**: Prevent XSS attacks, data corruption, and improve user experience

### 3. **Implement Rate Limiting & Security Measures**
- **Current Issue**: No protection against spam or abuse
- **Recommendation**: Add rate limiting for socket events, input sanitization, and CORS configuration
- **Benefits**: Prevent abuse, improve stability, and enhance security

## State Management & Performance

### 4. **Optimize State Management**
- **Current Issue**: Large state objects passed around, potential memory leaks
- **Recommendation**: 
  - Implement React Context more granularly (separate contexts for game state, user state, etc.)
  - Use React.memo and useMemo for expensive computations
  - Consider state normalization for complex nested data
- **Benefits**: Better performance, reduced re-renders, cleaner code

### 5. **Add Proper Data Persistence Strategy**
- **Current Issue**: Mixed persistence patterns, potential data loss
- **Recommendation**: 
  - Implement proper database migrations
  - Add data backup/restore functionality
  - Use transactions for critical operations
- **Benefits**: Data integrity, easier maintenance, better scalability

## Modern Development Practices

### 6. **Add TypeScript**
- **Current Issue**: No type safety, potential runtime errors
- **Recommendation**: Gradually migrate to TypeScript starting with interfaces and types
- **Benefits**: Better IDE support, fewer bugs, improved maintainability

### 7. **Implement Testing Strategy**
- **Current Issue**: No automated tests
- **Recommendation**: Add unit tests (Jest), integration tests, and E2E tests (Playwright/Cypress)
- **Benefits**: Prevent regressions, improve code quality, enable confident refactoring

### 8. **Add Environment Configuration Management**
- **Current Issue**: Hardcoded values, limited environment handling
- **Recommendation**: Use proper environment configuration with validation (dotenv + schema validation)
- **Benefits**: Easier deployment, better security, environment-specific settings

## Scalability & Reliability

### 9. **Implement Proper Session Management**
- **Current Issue**: In-memory session storage, potential memory leaks
- **Recommendation**: 
  - Use Redis for session storage in all environments
  - Implement session cleanup and expiration
  - Add reconnection handling improvements
- **Benefits**: Better scalability, reduced memory usage, improved reliability

### 10. **Add Monitoring & Health Checks**
- **Current Issue**: Limited visibility into application health
- **Recommendation**: 
  - Add health check endpoints
  - Implement metrics collection (Prometheus/StatsD)
  - Add application performance monitoring
- **Benefits**: Better observability, proactive issue detection, performance insights

## Code Organization

### 11. **Implement Clean Architecture Patterns**
- **Current Issue**: Business logic mixed with infrastructure concerns
- **Recommendation**: 
  - Separate domain logic from infrastructure
  - Implement repository pattern for data access
  - Use dependency injection for better testability
- **Benefits**: Better maintainability, easier testing, cleaner separation of concerns

### 12. **Add API Documentation & Standards**
- **Current Issue**: Socket events not well documented
- **Recommendation**: 
  - Document all socket events and their payloads
  - Implement API versioning strategy
  - Add request/response validation schemas
- **Benefits**: Better developer experience, easier integration, reduced bugs

## Rearchitecture Option Analysis

### Current Validation Problem
During validation refactoring, we identified the core issue: **no single source of truth for schemas**. Current approaches all have duplication:
- **Manual duplication**: Separate client/server schema files
- **Runtime API**: Still requires fallback schemas on client
- **Monorepo**: ~4 hour effort, solves duplication but adds complexity

### Recommended Solution: TypeScript + tRPC
**Why this is optimal for the wishlist:**
- ✅ **Addresses 6 wishlist items simultaneously** (#2, #4, #6, #11, #12 + validation)
- ✅ **Single source of truth**: Zod schemas generate both client types and server validation
- ✅ **Type safety**: End-to-end type safety from schema to UI
- ✅ **Auto-documentation**: API docs generated from schemas
- ✅ **Clean architecture**: Separates concerns properly

**Implementation approach:**
```typescript
// shared/schemas.ts - Single source of truth
export const userSetupSchema = z.object({
  playerName: z.string().min(1).max(20),
  teamName: z.string().min(1).max(30)
});

// Generates client types + server validation automatically
```

**Migration path:** 
1. Phase 1: Add TypeScript gradually (`.js` → `.ts`)
2. Phase 2: Replace Socket.IO with tRPC procedures
3. Phase 3: Migrate all validation to shared Zod schemas

**Effort estimate:** 1-2 weeks, but solves validation + 5 other architectural goals

**ROI:** Highest impact solution for modernization wishlist

### Alternative: TypeScript + Keep Current Architecture
**If you're okay with duplicated validation rules:**
- ✅ **Addresses 5 wishlist items** (#4, #6, #7, #11, #12)
- ✅ **No major architecture changes** - keep Socket.IO
- ✅ **Gradual migration** - add types incrementally
- ✅ **Familiar patterns** - no new frameworks to learn

**Implementation:**
```typescript
// client/src/types.ts + server/types.ts (duplicated but typed)
export interface UserSetupData {
  playerName: string;
  teamName: string;
}

// Both use same Zod schemas (duplicated but typed)
const userSetupSchema = z.object({
  playerName: z.string().min(1).max(20),
  teamName: z.string().min(1).max(30)
});
```

**Benefits:** Type safety, better IDE support, easier testing, gradual adoption

### JavaScript-Only Approach
**If staying with JavaScript, priority order for maximum ROI:**

**1. Testing (#7) - Highest Impact**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js']
};

// __tests__/UserSetup.test.js
test('validates team name length', () => {
  // Prevent regressions, enable confident refactoring
});
```
**Why first:** Prevents bugs, enables safe changes, builds confidence

**2. React Query (#4) - State Management**
```javascript
// Replace manual state management
const { data: gameState } = useQuery(['gameState', roomId], fetchGameState);
const joinTeam = useMutation(joinTeamAPI, {
  onSuccess: () => queryClient.invalidateQueries(['gameState'])
});
```
**Why second:** Eliminates state sync bugs, automatic caching, better UX

**3. Simple Monitoring (#10)**
```javascript
// server.js
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(),
    rooms: Object.keys(rooms).length 
  });
});
```
**Why third:** Production visibility with minimal effort

**4. Error Boundaries (#1)**
```javascript
// ErrorBoundary.jsx - Catch React crashes
class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    Logger.error('REACT_ERROR', error, errorInfo);
  }
}
```

**JavaScript-only benefits:**
- ✅ **No architecture changes** - keep current patterns
- ✅ **Immediate value** - each item provides instant benefits  
- ✅ **Low risk** - additive changes, no breaking modifications
- ✅ **Addresses 4 wishlist items** with practical improvements

**ROI:** Testing alone will save hours of debugging and give confidence for other improvements

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
- 9/22 2.5hrs
- 9/23 4hrs 