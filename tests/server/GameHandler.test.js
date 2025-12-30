const GameHandler = require('../../server/handlers/GameHandler');
const GAME_RULES = require('../../server/config/GameRules');

describe('GameHandler', () => {
  let mockSocket, mockIo, mockUserSession, mockRooms, mockGetOrCreateRoom, mockDebouncedSave;
  let mockRoom, mockGameplayManager, mockPlayerData;

  beforeEach(() => {
    // Mock socket
    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
      on: jest.fn()
    };

    // Mock io
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Mock player data
    mockPlayerData = {
      userId: 'user123',
      name: 'TestPlayer',
      team: 'Team A',
      isReady: false
    };

    // Mock gameplay manager
    mockGameplayManager = {
      beginTurn: jest.fn().mockReturnValue(true),
      endGuessing: jest.fn().mockReturnValue(true),
      revealResults: jest.fn().mockReturnValue(true),
      continueTurn: jest.fn().mockReturnValue(true),
      addGuess: jest.fn().mockReturnValue(true),
      toggleEntry: jest.fn().mockReturnValue(true),
      pauseGame: jest.fn().mockReturnValue(true),
      resumeGame: jest.fn().mockReturnValue(true),
      skipAnnouncer: jest.fn().mockReturnValue(true),
      skipCategory: jest.fn().mockReturnValue(true),
      getCurrentAnnouncerSocket: jest.fn().mockReturnValue('socket123'),
      getCurrentAnnouncer: jest.fn().mockReturnValue('TestPlayer'),
      getCurrentGuessingTeam: jest.fn().mockReturnValue('Team A'),
      canAllPlayersReveal: jest.fn().mockReturnValue(false),
      turnPhase: GAME_RULES.TURN_PHASES.CATEGORY_SELECTION,
      currentTurn: 0,
      currentCategory: { name: 'Test Category' }
    };

    // Mock room
    mockRoom = {
      gameState: GAME_RULES.PHASES.ONBOARDING,
      teams: {
        'Team A': { name: 'Team A', players: ['user1', 'user2'] },
        'Team B': { name: 'Team B', players: ['user3', 'user4'] }
      },
      players: {
        user123: mockPlayerData
      },
      gameSettings: {
        timeLimit: 60,
        turnsPerTeam: 3
      },
      currentGame: mockGameplayManager,
      startGame: jest.fn().mockReturnValue(true),
      emergencyReset: jest.fn().mockReturnValue(true),
      getState: jest.fn().mockReturnValue({ gameState: GAME_RULES.PHASES.GAMEPLAY }),
      getUserForSocket: jest.fn().mockReturnValue('user123')
    };

    // Mock user session
    mockUserSession = {
      currentRoom: 'room1'
    };

    // Mock rooms storage
    mockRooms = {};

    // Mock getOrCreateRoom
    mockGetOrCreateRoom = jest.fn().mockReturnValue(mockRoom);

    // Mock debounced save
    mockDebouncedSave = jest.fn();
  });

  describe('register', () => {
    test('should register all game event handlers', () => {
      GameHandler.register(mockSocket, mockIo, mockUserSession, mockRooms, mockGetOrCreateRoom, mockDebouncedSave);

      const expectedEvents = [
        'startGame', 'beginTurn', 'endGuessing', 'revealResults', 'continueTurn',
        'submitGuess', 'toggleEntry', 'pauseGame', 'resumeGame', 'restartGame',
        'skipAnnouncer', 'skipCategory', 'toggleReady', 'emergencyReset'
      ];

      expectedEvents.forEach(event => {
        expect(mockSocket.on).toHaveBeenCalledWith(event, expect.any(Function));
      });
    });
  });

  describe('handleStartGame', () => {
    const gameData = { timeLimit: 90, rounds: 5 };

    test('should start game with valid teams and players', () => {
      GameHandler.handleStartGame(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, gameData);

      expect(mockRoom.startGame).toHaveBeenCalled();
      expect(mockRoom.gameSettings.timeLimit).toBe(90);
      expect(mockRoom.gameSettings.turnsPerTeam).toBe(5);
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
      expect(mockDebouncedSave).toHaveBeenCalled();
    });

    test('should use default settings when not provided', () => {
      GameHandler.handleStartGame(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, {});

      expect(mockRoom.gameSettings.timeLimit).toBe(GAME_RULES.DEFAULT_TIME_LIMIT);
      expect(mockRoom.gameSettings.turnsPerTeam).toBe(GAME_RULES.DEFAULT_ROUNDS);
    });

    test('should fail with insufficient teams', () => {
      mockRoom.teams = { 'Team A': { name: 'Team A', players: ['user1', 'user2'] } };

      GameHandler.handleStartGame(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, gameData);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameError', {
        message: `Need at least ${GAME_RULES.MIN_TEAMS_TO_START} teams to start the game`
      });
      expect(mockRoom.startGame).not.toHaveBeenCalled();
    });

    test('should fail with insufficient players per team', () => {
      mockRoom.teams['Team A'].players = ['user1'];

      GameHandler.handleStartGame(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, gameData);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameError', {
        message: expect.stringContaining('Each team needs at least')
      });
      expect(mockRoom.startGame).not.toHaveBeenCalled();
    });

    test('should handle room start failure', () => {
      mockRoom.startGame.mockReturnValue(false);

      GameHandler.handleStartGame(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, gameData);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameError', {
        message: 'Failed to start game'
      });
    });

    test('should handle missing room', () => {
      mockUserSession.currentRoom = null;

      GameHandler.handleStartGame(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, gameData);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameError', {
        message: 'No current room found'
      });
    });
  });

  describe('handleBeginTurn', () => {
    beforeEach(() => {
      mockRoom.gameState = GAME_RULES.PHASES.GAMEPLAY;
    });

    test('should begin turn when announcer calls it', () => {
      GameHandler.handleBeginTurn(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.beginTurn).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
      expect(mockDebouncedSave).toHaveBeenCalled();
    });

    test('should not begin turn when non-announcer calls it', () => {
      mockGameplayManager.getCurrentAnnouncerSocket.mockReturnValue('other-socket');

      GameHandler.handleBeginTurn(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.beginTurn).not.toHaveBeenCalled();
    });

    test('should not begin turn when not in gameplay phase', () => {
      mockRoom.gameState = GAME_RULES.PHASES.ONBOARDING;

      GameHandler.handleBeginTurn(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.beginTurn).not.toHaveBeenCalled();
    });
  });

  describe('handleSubmitGuess', () => {
    const guessData = { guess: 'test guess' };

    beforeEach(() => {
      mockRoom.gameState = GAME_RULES.PHASES.GAMEPLAY;
      mockGameplayManager.turnPhase = GAME_RULES.TURN_PHASES.ACTIVE_GUESSING;
      mockGameplayManager.getCurrentAnnouncerSocket.mockReturnValue('other-socket');
    });

    test('should accept guess from guessing team member', () => {
      GameHandler.handleSubmitGuess(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, guessData);

      expect(mockGameplayManager.addGuess).toHaveBeenCalledWith('test guess', 'TestPlayer');
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });

    test('should reject guess from announcer', () => {
      mockGameplayManager.getCurrentAnnouncerSocket.mockReturnValue('socket123');

      GameHandler.handleSubmitGuess(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, guessData);

      expect(mockGameplayManager.addGuess).not.toHaveBeenCalled();
    });

    test('should reject guess from wrong team', () => {
      mockGameplayManager.getCurrentGuessingTeam.mockReturnValue('Team B');

      GameHandler.handleSubmitGuess(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, guessData);

      expect(mockGameplayManager.addGuess).not.toHaveBeenCalled();
    });

    test('should reject guess when not in active guessing phase', () => {
      mockGameplayManager.turnPhase = GAME_RULES.TURN_PHASES.CATEGORY_SELECTION;

      GameHandler.handleSubmitGuess(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, guessData);

      expect(mockGameplayManager.addGuess).not.toHaveBeenCalled();
    });
  });

  describe('handleToggleEntry', () => {
    const entryData = { entry: 'test entry' };

    beforeEach(() => {
      mockRoom.gameState = GAME_RULES.PHASES.GAMEPLAY;
    });

    test('should toggle entry when announcer calls it', () => {
      GameHandler.handleToggleEntry(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, entryData);

      expect(mockGameplayManager.toggleEntry).toHaveBeenCalledWith('test entry');
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });

    test('should not toggle entry when non-announcer calls it', () => {
      mockGameplayManager.getCurrentAnnouncerSocket.mockReturnValue('other-socket');

      GameHandler.handleToggleEntry(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, entryData);

      expect(mockGameplayManager.toggleEntry).not.toHaveBeenCalled();
    });
  });

  describe('handlePauseGame and handleResumeGame', () => {
    beforeEach(() => {
      mockRoom.gameState = GAME_RULES.PHASES.GAMEPLAY;
    });

    test('should pause game', () => {
      GameHandler.handlePauseGame(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.pauseGame).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });

    test('should resume game', () => {
      GameHandler.handleResumeGame(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.resumeGame).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });
  });

  describe('handleSkipCategory', () => {
    beforeEach(() => {
      mockRoom.gameState = GAME_RULES.PHASES.GAMEPLAY;
    });

    test('should skip category when announcer calls it', () => {
      GameHandler.handleSkipCategory(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.skipCategory).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });

    test('should not skip category when non-announcer calls it', () => {
      mockGameplayManager.getCurrentAnnouncerSocket.mockReturnValue('other-socket');

      GameHandler.handleSkipCategory(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.skipCategory).not.toHaveBeenCalled();
    });
  });

  describe('handleToggleReady', () => {
    test('should toggle player ready state', () => {
      expect(mockPlayerData.isReady).toBe(false);

      GameHandler.handleToggleReady(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockPlayerData.isReady).toBe(true);
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });

    test('should handle missing player', () => {
      mockRoom.getUserForSocket.mockReturnValue(null);

      GameHandler.handleToggleReady(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockIo.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleEmergencyReset', () => {
    test('should perform emergency reset', () => {
      GameHandler.handleEmergencyReset(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockRoom.emergencyReset).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });

    test('should handle reset failure', () => {
      mockRoom.emergencyReset.mockReturnValue(false);

      GameHandler.handleEmergencyReset(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockIo.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleRevealResults', () => {
    beforeEach(() => {
      mockRoom.gameState = GAME_RULES.PHASES.GAMEPLAY;
    });

    test('should reveal results when announcer calls it', () => {
      GameHandler.handleRevealResults(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.revealResults).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('room1');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });

    test('should reveal results when all players can reveal', () => {
      mockGameplayManager.getCurrentAnnouncerSocket.mockReturnValue('other-socket');
      mockGameplayManager.canAllPlayersReveal.mockReturnValue(true);

      GameHandler.handleRevealResults(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.revealResults).toHaveBeenCalled();
    });

    test('should not reveal results when non-announcer calls and all players cannot reveal', () => {
      mockGameplayManager.getCurrentAnnouncerSocket.mockReturnValue('other-socket');
      mockGameplayManager.canAllPlayersReveal.mockReturnValue(false);

      GameHandler.handleRevealResults(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave);

      expect(mockGameplayManager.revealResults).not.toHaveBeenCalled();
    });
  });
});