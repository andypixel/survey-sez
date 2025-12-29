const RoomHandler = require('../../server/handlers/RoomHandler');
const GAME_RULES = require('../../server/config/GameRules');

describe('RoomHandler', () => {
  let mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions;
  let mockRoom;

  beforeEach(() => {
    // Mock socket
    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn()
    };

    // Mock io
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map([
            ['room1', new Set(['socket123', 'socket456'])]
          ])
        }
      }
    };

    // Mock room
    mockRoom = {
      players: {},
      teams: {
        'Team A': { name: 'Team A', players: ['user1'] }
      },
      addPlayer: jest.fn(),
      getTeamNames: jest.fn().mockReturnValue(['Team A']),
      canCreateTeam: jest.fn().mockReturnValue(true),
      getState: jest.fn().mockReturnValue({ gameState: GAME_RULES.PHASES.ONBOARDING })
    };

    // Mock user session
    mockUserSession = {
      currentRoom: 'room1',
      userId: 'user123',
      joinRoom: jest.fn(),
      getUserData: jest.fn().mockReturnValue(null),
      setUserData: jest.fn()
    };

    // Mock getOrCreateRoom
    mockGetOrCreateRoom = jest.fn().mockReturnValue(mockRoom);

    // Mock debounced save
    mockDebouncedSave = jest.fn();

    // Mock user sessions
    mockUserSessions = {
      socket456: {
        getUserData: jest.fn().mockReturnValue({ setupComplete: true })
      }
    };
  });

  describe('register', () => {
    test('should register room event handlers', () => {
      RoomHandler.register(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions);

      expect(mockSocket.on).toHaveBeenCalledWith('joinRoom', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('userSetup', expect.any(Function));
    });
  });

  describe('handleJoinRoom', () => {
    test('should join room and send setup info', () => {
      RoomHandler.handleJoinRoom(mockSocket, mockUserSession, mockGetOrCreateRoom, 'room1');

      expect(mockUserSession.joinRoom).toHaveBeenCalledWith('room1');
      expect(mockSocket.join).toHaveBeenCalledWith('room1');
      expect(mockGetOrCreateRoom).toHaveBeenCalledWith('room1');
      expect(mockSocket.emit).toHaveBeenCalledWith('roomSetup', {
        roomId: 'room1',
        existingTeams: ['Team A'],
        canCreateTeam: true
      });
    });
  });

  describe('handleUserSetup', () => {
    const validSetupData = {
      playerName: 'TestPlayer',
      existingTeam: 'Team A',
      userId: 'user123'
    };

    test('should setup user with existing team', () => {
      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, validSetupData);

      expect(mockRoom.addPlayer).toHaveBeenCalledWith('socket123', {
        name: 'TestPlayer',
        team: 'Team A',
        userId: 'user123'
      });
      expect(mockUserSession.setUserData).toHaveBeenCalledWith('room1', {
        userId: 'user123',
        name: 'TestPlayer',
        team: 'Team A',
        setupComplete: true
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
      expect(mockDebouncedSave).toHaveBeenCalled();
    });

    test('should setup user with new team', () => {
      const newTeamData = {
        playerName: 'TestPlayer',
        newTeamName: 'Team B',
        userId: 'user123'
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, newTeamData);

      expect(mockRoom.addPlayer).toHaveBeenCalledWith('socket123', {
        name: 'TestPlayer',
        team: 'Team B',
        userId: 'user123'
      });
      expect(mockUserSession.setUserData).toHaveBeenCalledWith('room1', {
        userId: 'user123',
        name: 'TestPlayer',
        team: 'Team B',
        setupComplete: true
      });
    });

    test('should use session userId when not provided', () => {
      const dataWithoutUserId = {
        playerName: 'TestPlayer',
        existingTeam: 'Team A'
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, dataWithoutUserId);

      expect(mockRoom.addPlayer).toHaveBeenCalledWith('socket123', {
        name: 'TestPlayer',
        team: 'Team A',
        userId: 'user123'
      });
    });

    test('should reject invalid team selection', () => {
      const invalidData = {
        playerName: 'TestPlayer',
        userId: 'user123'
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, invalidData);

      expect(mockSocket.emit).toHaveBeenCalledWith('setupError', {
        message: 'Invalid team selection'
      });
      expect(mockRoom.addPlayer).not.toHaveBeenCalled();
    });

    test('should reject duplicate player names', () => {
      mockRoom.players = {
        user1: { userId: 'user1', name: 'TestPlayer' }
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, validSetupData);

      expect(mockSocket.emit).toHaveBeenCalledWith('setupError', {
        message: 'A player with this name already exists in the room'
      });
      expect(mockRoom.addPlayer).not.toHaveBeenCalled();
    });

    test('should allow same user to rejoin with same name', () => {
      mockRoom.players = {
        user123: { userId: 'user123', name: 'TestPlayer' }
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, validSetupData);

      expect(mockRoom.addPlayer).toHaveBeenCalled();
      expect(mockSocket.emit).not.toHaveBeenCalledWith('setupError', expect.any(Object));
    });

    test('should reject duplicate team names (case insensitive)', () => {
      const duplicateTeamData = {
        playerName: 'TestPlayer',
        newTeamName: 'team a',
        userId: 'user123'
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, duplicateTeamData);

      expect(mockSocket.emit).toHaveBeenCalledWith('setupError', {
        message: 'A team with this name already exists in the room'
      });
      expect(mockRoom.addPlayer).not.toHaveBeenCalled();
    });

    test('should reject new team when team creation not allowed', () => {
      mockRoom.canCreateTeam.mockReturnValue(false);
      const newTeamData = {
        playerName: 'TestPlayer',
        newTeamName: 'Team B',
        userId: 'user123'
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, newTeamData);

      expect(mockSocket.emit).toHaveBeenCalledWith('setupError', {
        message: 'Invalid team selection'
      });
      expect(mockRoom.addPlayer).not.toHaveBeenCalled();
    });

    test('should handle missing player name', () => {
      const invalidData = {
        existingTeam: 'Team A',
        userId: 'user123'
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, invalidData);

      expect(mockRoom.addPlayer).not.toHaveBeenCalled();
    });

    test('should handle missing room', () => {
      mockUserSession.currentRoom = null;

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, validSetupData);

      expect(mockRoom.addPlayer).not.toHaveBeenCalled();
    });

    test('should detect and handle rejoins', () => {
      mockUserSession.getUserData.mockReturnValue({
        name: 'TestPlayer',
        team: 'Team A'
      });

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, validSetupData);

      expect(mockRoom.addPlayer).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
      // Should not broadcast to other users on rejoin
      expect(mockIo.to).not.toHaveBeenCalled();
    });

    test('should broadcast to other users on new join', () => {
      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, validSetupData);

      expect(mockIo.to).toHaveBeenCalledWith('socket456');
      expect(mockIo.emit).toHaveBeenCalledWith('gameState', expect.any(Object));
    });

    test('should send room setup to users not yet setup', () => {
      mockUserSessions.socket456.getUserData.mockReturnValue({ setupComplete: false });

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, validSetupData);

      expect(mockIo.to).toHaveBeenCalledWith('socket456');
      expect(mockIo.emit).toHaveBeenCalledWith('roomSetup', {
        roomId: 'room1',
        existingTeams: ['Team A'],
        canCreateTeam: true
      });
    });

    test('should handle case insensitive name comparison', () => {
      mockRoom.players = {
        user1: { userId: 'user1', name: 'testplayer' }
      };

      const setupData = {
        playerName: 'TestPlayer',
        existingTeam: 'Team A',
        userId: 'user123'
      };

      RoomHandler.handleUserSetup(mockSocket, mockIo, mockUserSession, mockGetOrCreateRoom, mockDebouncedSave, mockUserSessions, setupData);

      expect(mockSocket.emit).toHaveBeenCalledWith('setupError', {
        message: 'A player with this name already exists in the room'
      });
    });
  });
});