/**
 * Handles room joining workflow and URL-based room detection
 */
class RoomJoinWorkflow {
  /**
   * Initialize room join workflow
   * @param {Object} socket - Socket.IO client instance
   * @param {Object} callbacks - App state update callbacks
   */
  constructor(socket, callbacks) {
    this.socket = socket;
    this.callbacks = callbacks;
  }

  /**
   * Handle room join form submission
   * @param {Event} e - Form submit event
   */
  handleRoomJoin(e) {
    e.preventDefault();
    const room = e.target.roomInput.value.trim();
    if (room) {
      this.callbacks.setRoomId(room);
      this.callbacks.setIsInRoom(false);
      // URL encode for navigation but keep original for room ID
      const encodedRoom = encodeURIComponent(room);
      window.history.pushState({}, '', `/room/${encodedRoom}`);
      // TODO: Remove setTimeout hack, handle connection state properly
      setTimeout(() => this.socket.emit('joinRoom', room), 100);
    }
  }

  /**
   * Extract room ID from current URL path
   * @returns {string} Room ID or empty string if not found
   */
  initializeFromUrl() {
    const path = window.location.pathname;
    const roomMatch = path.match(/\/room\/(.+)/);
    if (roomMatch) {
      // Decode URL-encoded room name
      return decodeURIComponent(roomMatch[1]);
    }
    return '';
  }
}

export default RoomJoinWorkflow;