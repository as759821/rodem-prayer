// Rodem Prayer Meeting - DB & LocalStorage Service

const LOCAL_STORAGE_KEYS = {
  USER_NAME: 'rodem_prayer_user_name',
  USER_LOGS: 'rodem_prayer_user_logs',
  MOCK_INIT: 'rodem_prayer_mock_initialized_v1'
};

// 기본 가상 데이터 (LocalStorage 시뮬레이션 모드에서 사용)
const MOCK_PRAYER_FEED = [
  { id: 'mock-1', name: '김은혜', minutes: 30, memo: '오늘도 기도의 자리를 지킬 수 있어 감사했습니다. 🌿', timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString() },
  { id: 'mock-2', name: '이요한', minutes: 45, memo: '로뎀나무 아래에서 깊은 평안을 누립니다.', timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString() },
  { id: 'mock-3', name: '박지민', minutes: 60, memo: '공동체가 마음을 모아 함께 기도하니 정말 든든합니다! 🔥', timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString() },
  { id: 'mock-4', name: '최서연', minutes: 20, memo: '바쁜 하루의 시작을 주님과 동행하며 묵상합니다.', timestamp: new Date(Date.now() - 240 * 60 * 1000).toISOString() },
  { id: 'mock-5', name: '정태양', minutes: 40, memo: '가정과 직장을 위한 도고 기도의 시간.', timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString() }
];

const INITIAL_STATS = {
  baseHours: 428,
  baseMinutes: 35,
  baseTargetHours: 1000,
  baseTodayVisitors: 8
};

export const dbService = {
  // 앱 구동 시 초기화
  init() {
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.MOCK_INIT)) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER_LOGS, JSON.stringify([]));
      localStorage.setItem(LOCAL_STORAGE_KEYS.MOCK_INIT, 'true');
    }
  },

  // 1. 유저 닉네임 관리
  getUserName() {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.USER_NAME) || '';
  },

  setUserName(name) {
    if (!name || name.trim() === '') return;
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER_NAME, name.trim());
    this._markLocalVisitor();
  },

  // 2. 전체 통계 조회
  async getGlobalStats() {
    const userLogs = this._getUserLogs();
    const userTotalMinutes = userLogs.reduce((sum, log) => sum + Number(log.minutes), 0);
    const mockTotalMinutes = MOCK_PRAYER_FEED.reduce((sum, log) => sum + Number(log.minutes), 0);
    
    const grandTotalMinutes = (INITIAL_STATS.baseHours * 60) + INITIAL_STATS.baseMinutes + mockTotalMinutes + userTotalMinutes;
    const totalHours = Math.floor(grandTotalMinutes / 60);
    const totalMinutes = grandTotalMinutes % 60;
    
    const todayVisitors = INITIAL_STATS.baseTodayVisitors + (this.getUserName() ? 1 : 0);

    return {
      totalHours,
      totalMinutes,
      targetHours: INITIAL_STATS.baseTargetHours,
      todayVisitors,
      progressPercentage: Math.min(Math.round((grandTotalMinutes / (INITIAL_STATS.baseTargetHours * 60)) * 1000) / 10, 100)
    };
  },

  // 3. 기도 피드(방명록) 전체 목록 조회
  async getPrayerFeed() {
    const userLogs = this._getUserLogs().map(log => ({
      id: log.id,
      name: log.name,
      minutes: log.minutes,
      memo: log.memo,
      timestamp: log.timestamp,
      isUser: true
    }));

    const combined = [...userLogs, ...MOCK_PRAYER_FEED];
    return combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  // 4. 새로운 기도 기록 등록
  async addPrayerLog(minutes, memo) {
    const name = this.getUserName() || '익명의 동역자';
    const newLog = {
      name,
      minutes: Number(minutes),
      memo: memo || '오늘도 은혜로 기도를 마쳤습니다. 🌿'
    };

    const localLog = {
      ...newLog,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    const logs = this._getUserLogs();
    logs.push(localLog);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER_LOGS, JSON.stringify(logs));
    
    this._markLocalVisitor();
    return localLog;
  },

  // 내부 헬퍼 메서드
  _getUserLogs() {
    const data = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_LOGS);
    return data ? JSON.parse(data) : [];
  },

  _markLocalVisitor() {
    const today = new Date().toDateString();
    localStorage.setItem(`rodem_visitor_${today}`, 'true');
  }
};
