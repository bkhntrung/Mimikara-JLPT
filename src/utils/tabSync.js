/**
 * Module Chống xung đột Đa cửa sổ / Đa tab & Đồng bộ thời gian thực
 * Multi-Tab Conflict Prevention & Real-time Storage Sync
 * 
 * Bảo vệ triệt để dữ liệu SRS không bị ghi đè lẫn nhau (Lost Update) khi người dùng
 * mở nhiều tab / cửa sổ trình duyệt cùng lúc.
 */

// Sinh định danh tab duy nhất (bảo toàn theo sessionStorage của mỗi tab trình duyệt)
export function generateTabId() {
  if (typeof sessionStorage !== 'undefined') {
    try {
      let id = sessionStorage.getItem('mimikara_tab_id');
      if (!id) {
        id = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('mimikara_tab_id', id);
      }
      return id;
    } catch (e) {}
  }
  return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const TAB_SYNC_KEYS = {
  ACTIVE_TAB_ID: 'mimikara_active_tab_id',
  HEARTBEAT: 'mimikara_active_tab_heartbeat',
  EVENT: 'mimikara_tab_event'
};

export const TAB_CHANNEL_NAME = 'mimikara_tab_channel';
export const HEARTBEAT_INTERVAL_MS = 1500;
export const HEARTBEAT_TIMEOUT_MS = 4500;

/**
 * Trình quản lý Đồng bộ & Khóa Đa Tab
 */
export class TabSyncManager {
  constructor(options = {}) {
    this.tabId = options.tabId || generateTabId();
    this.onLockChange = options.onLockChange || (() => {});
    this.onRemoteDataUpdate = options.onRemoteDataUpdate || (() => {});
    
    this.isLocked = false;
    this.heartbeatTimer = null;
    this.channel = null;
    this.storageListener = null;
    this.unloadListener = null;

    this.init();
  }

  get isBrowser() {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  init() {
    if (!this.isBrowser) return;

    // 1. Khởi tạo BroadcastChannel nếu trình duyệt hỗ trợ
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(TAB_CHANNEL_NAME);
        this.channel.onmessage = (event) => this.handleChannelMessage(event.data);
      } catch (e) {
        this.channel = null;
      }
    }

    // 2. Lắng nghe storage event (cho đồng bộ dữ liệu thời gian thực & fallback đa tab)
    this.storageListener = (e) => this.handleStorageEvent(e);
    window.addEventListener('storage', this.storageListener);

    // 3. Giải phóng lock khi đóng tab
    this.unloadListener = () => {
      this.cleanupOnUnload();
    };
    window.addEventListener('beforeunload', this.unloadListener);
    window.addEventListener('pagehide', this.unloadListener);

    // 4. Kiểm tra xem đã có tab nào đang active chưa
    this.checkInitialLock();
  }

  checkInitialLock() {
    if (!this.isBrowser) return;

    try {
      const activeId = localStorage.getItem(TAB_SYNC_KEYS.ACTIVE_TAB_ID);
      const lastHeartbeat = Number(localStorage.getItem(TAB_SYNC_KEYS.HEARTBEAT) || 0);
      const isAlive = activeId && (Date.now() - lastHeartbeat < HEARTBEAT_TIMEOUT_MS);

      if (isAlive && activeId !== this.tabId) {
        // Đã có tab khác đang active -> Tạm khóa tab này để chống xung đột!
        this.setLocked(true);
        // Gửi ping qua BroadcastChannel kiểm tra
        this.postMessage({ type: 'PING_ACTIVE', senderId: this.tabId });
      } else {
        // Chưa có tab nào hoặc tab cũ đã tắt/hết hạn -> Chiếm quyền active
        this.claimActiveSession();
      }
    } catch (e) {
      console.warn('Lỗi khi kiểm tra active tab:', e);
    }
  }

  setLocked(locked) {
    if (this.isLocked !== locked) {
      this.isLocked = locked;
      this.onLockChange(locked);

      if (locked) {
        this.stopHeartbeat();
      } else {
        this.startHeartbeat();
      }
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.sendHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  sendHeartbeat() {
    if (!this.isBrowser || this.isLocked) return;
    try {
      localStorage.setItem(TAB_SYNC_KEYS.ACTIVE_TAB_ID, this.tabId);
      localStorage.setItem(TAB_SYNC_KEYS.HEARTBEAT, String(Date.now()));
    } catch (e) {}
  }

  /**
   * Kích hoạt phiên làm việc tại tab hiện tại (Takeover session)
   */
  claimActiveSession() {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(TAB_SYNC_KEYS.ACTIVE_TAB_ID, this.tabId);
      localStorage.setItem(TAB_SYNC_KEYS.HEARTBEAT, String(Date.now()));
      
      const payload = {
        type: 'TAKEOVER_SESSION',
        newActiveTabId: this.tabId,
        timestamp: Date.now()
      };

      // Phát tín hiệu takeover qua BroadcastChannel
      this.postMessage(payload);

      // Phát tín hiệu qua localStorage cho các trình duyệt không có channel
      localStorage.setItem(TAB_SYNC_KEYS.EVENT, JSON.stringify(payload));

      this.setLocked(false);
    } catch (e) {
      console.warn('Lỗi claim active session:', e);
    }
  }

  /**
   * Phát thông báo cập nhật dữ liệu khi người dùng vừa học hoặc thay đổi SRS / Starred
   */
  broadcastDataUpdate(level, key) {
    const payload = {
      type: 'DATA_UPDATED',
      level,
      key,
      senderId: this.tabId,
      timestamp: Date.now()
    };
    this.postMessage(payload);
  }

  postMessage(message) {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {}
    }
  }

  handleChannelMessage(data) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'TAKEOVER_SESSION') {
      if (data.newActiveTabId !== this.tabId) {
        // Tab khác vừa claim quyền -> Tab này chuyển sang tạm khóa
        this.setLocked(true);
      }
    } else if (data.type === 'PING_ACTIVE') {
      if (!this.isLocked && data.senderId !== this.tabId) {
        // Tab này đang active, trả lời pong để tab mới biết phải khóa
        this.postMessage({
          type: 'PONG_ACTIVE',
          activeTabId: this.tabId,
          senderId: this.tabId
        });
      }
    } else if (data.type === 'PONG_ACTIVE') {
      if (data.activeTabId && data.activeTabId !== this.tabId) {
        this.setLocked(true);
      }
    } else if (data.type === 'DATA_UPDATED') {
      if (data.senderId !== this.tabId) {
        this.onRemoteDataUpdate({
          level: data.level,
          key: data.key,
          fromTab: data.senderId
        });
      }
    }
  }

  handleStorageEvent(e) {
    if (!e || !e.key) return;

    // Xử lý sự kiện takeover qua localStorage fallback
    if (e.key === TAB_SYNC_KEYS.EVENT && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data.type === 'TAKEOVER_SESSION' && data.newActiveTabId !== this.tabId) {
          this.setLocked(true);
        }
      } catch (err) {}
      return;
    }

    // Xử lý đồng bộ dữ liệu thời gian thực khi SRS hoặc Starred của bất kỳ cấp độ nào thay đổi
    const matchSRS = e.key.match(/^mimikara_(n[123])_srs_records$/i);
    const matchStarred = e.key.match(/^mimikara_(n[123])_starred$/i);

    if (matchSRS) {
      const level = matchSRS[1].toUpperCase();
      this.onRemoteDataUpdate({
        type: 'srs',
        level,
        key: e.key
      });
    } else if (matchStarred) {
      const level = matchStarred[1].toUpperCase();
      this.onRemoteDataUpdate({
        type: 'starred',
        level,
        key: e.key
      });
    }
  }

  cleanupOnUnload() {
    if (!this.isBrowser) return;
    try {
      const currentActive = localStorage.getItem(TAB_SYNC_KEYS.ACTIVE_TAB_ID);
      if (currentActive === this.tabId) {
        localStorage.removeItem(TAB_SYNC_KEYS.ACTIVE_TAB_ID);
        localStorage.removeItem(TAB_SYNC_KEYS.HEARTBEAT);
      }
    } catch (e) {}
  }

  destroy() {
    this.stopHeartbeat();
    if (this.isBrowser) {
      if (this.storageListener) {
        window.removeEventListener('storage', this.storageListener);
      }
      if (this.unloadListener) {
        window.removeEventListener('beforeunload', this.unloadListener);
        window.removeEventListener('pagehide', this.unloadListener);
      }
    }
    if (this.channel) {
      try {
        this.channel.close();
      } catch (e) {}
    }
  }
}
