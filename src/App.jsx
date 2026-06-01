import { useState, useEffect, useRef } from 'react';
import { dbService } from './services/dbService';
import './App.css';

function App() {
  // 상태 선언
  const [userName, setUserName] = useState(() => dbService.getUserName());
  const [inputName, setInputName] = useState(() => dbService.getUserName());
  const [globalStats, setGlobalStats] = useState({
    totalHours: 0,
    totalMinutes: 0,
    targetHours: 1000,
    todayVisitors: 0,
    progressPercentage: 0
  });
  const [prayerFeed, setPrayerFeed] = useState([]);
  
  // 타이머 관련 상태
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // 모달 관련 상태
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // 입력 폼 상태
  const [manualMinutes, setManualMinutes] = useState(30);
  const [manualMemo, setManualMemo] = useState('');
  const [completeMemo, setCompleteMemo] = useState('');

  // 좋아요(하트) 클릭 상태 저장 (로컬 보관)
  const [likedCards, setLikedCards] = useState(() => {
    const savedLikes = localStorage.getItem('rodem_prayer_likes');
    return savedLikes ? JSON.parse(savedLikes) : {};
  });

  // 데이터 갱신 헬퍼 (호이스팅 방지 및 useEffect 위 배치)
  const refreshData = async () => {
    try {
      const stats = await dbService.getGlobalStats();
      const feed = await dbService.getPrayerFeed();
      setGlobalStats(stats);
      setPrayerFeed(feed);
    } catch (e) {
      console.error('데이터 갱신 에러:', e);
    }
  };

  // 1. 앱 구동 시 초기 로드
  useEffect(() => {
    dbService.init();
    
    // 비동기 마이크로태스크로 격리하여 린트 경고 방지
    Promise.resolve().then(() => {
      refreshData();
    });
  }, []);

  // 닉네임 설정 완료
  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    dbService.setUserName(inputName);
    setUserName(inputName.trim());
    await refreshData();
  };

  // 닉네임 수정 모드
  const handleNameReset = () => {
    if (window.confirm('이름을 수정하시겠습니까?')) {
      localStorage.removeItem('rodem_prayer_user_name');
      setUserName('');
    }
  };

  // 타이머 핸들러
  const startTimer = () => {
    setIsTimerRunning(true);
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const cancelTimer = () => {
    if (window.confirm('기도 시간 측정을 취소하시겠습니까? 기록이 저장되지 않습니다.')) {
      stopTimerCleanup();
    }
  };

  const stopTimerCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerRunning(false);
    setElapsedSeconds(0);
  };

  const openCompletionModal = () => {
    if (elapsedSeconds < 10) {
      alert('최소 10초 이상 기도하셔야 등록이 가능합니다. 🌿');
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCompleteMemo('');
    setShowCompleteModal(true);
  };

  const saveTimerPrayer = async () => {
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60)); // 최소 1분 저장
    await dbService.addPrayerLog(minutes, completeMemo.trim());
    stopTimerCleanup();
    setShowCompleteModal(false);
    await refreshData();
    alert(`정성어린 ${minutes}분의 기도가 온도계에 누적되었습니다. 🌿`);
  };

  // 직접 입력 핸들러
  const handleManualSave = async (e) => {
    e.preventDefault();
    if (manualMinutes <= 0) {
      alert('1분 이상의 기도 시간을 입력해주세요.');
      return;
    }
    await dbService.addPrayerLog(manualMinutes, manualMemo.trim());
    setShowManualModal(false);
    setManualMinutes(30);
    setManualMemo('');
    await refreshData();
    alert(`기도 시간 ${manualMinutes}분이 성공적으로 누적되었습니다. 🌿`);
  };

  // 좋아요 기능
  const toggleLike = (cardId) => {
    const newLikes = { ...likedCards, [cardId]: !likedCards[cardId] };
    setLikedCards(newLikes);
    localStorage.setItem('rodem_prayer_likes', JSON.stringify(newLikes));
  };

  // 시간 포맷팅 헬퍼
  const formatTime = (totalSecs) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 상대 시간 표시 헬퍼
  const getRelativeTimeString = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 이름 등록이 안 되어 있으면 웰컴 스크린 렌더링
  if (!userName) {
    return (
      <div className="welcome-overlay">
        <div className="welcome-card">
          <div className="welcome-logo">🌿</div>
          <h2>로뎀나무 아래</h2>
          <p>
            로뎀기도회에 오신 것을 환영합니다.<br />
            매일 함께 쌓아가는 기도의 온도를 함께 나눠요.
          </p>
          <form onSubmit={handleNameSubmit} className="welcome-input-group">
            <input
              type="text"
              placeholder="이름이나 닉네임을 입력해 주세요"
              className="welcome-input"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              maxLength={10}
              required
            />
            <button type="submit" className="btn-submit">입장하기</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* 상단 네비게이션/세팅 바 */}
      <div className="user-settings-bar">
        <span>동역자 <strong>{userName}</strong> 님</span>
        <button onClick={handleNameReset} className="btn-text">이름 수정</button>
      </div>

      {/* 헤더 */}
      <header className="app-header">
        <span className="header-badge">로뎀기도회</span>
        <h1>로뎀 기도 온도계</h1>
        <p>우리 함께 마음을 모아 기도의 온도를 올려요 ✨</p>
      </header>

      {/* 실시간 묵상 알림 배너 */}
      {isTimerRunning && (
        <div className="live-prayer-banner">
          <div className="live-indicator"></div>
          <span><strong>{userName}</strong> 님이 로뎀나무 아래에서 기도하는 중입니다.</span>
        </div>
      )}

      {/* 메인 대시보드 */}
      <section className="dashboard-card">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">오늘 기도한 동역자</span>
            <span className="stat-value">{globalStats.todayVisitors}명</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">전체 누적 기도시간</span>
            <span className="stat-value highlight">
              {globalStats.totalHours}시간 {globalStats.totalMinutes}분
            </span>
          </div>
        </div>

        {/* 온도계 게이지 */}
        <div className="thermometer-container">
          <div className="thermo-header">
            <span className="thermo-title">🌳 현재 기도 온도</span>
            <span className="thermo-target">목표 {globalStats.targetHours}시간</span>
          </div>
          <div className="thermo-track">
            <div 
              className="thermo-fill" 
              style={{ width: `${globalStats.progressPercentage}%` }}
            >
              <div className="thermo-bubble"></div>
            </div>
          </div>
          <div className="thermo-percentage">
            {globalStats.progressPercentage}% 채워짐
          </div>
        </div>
      </section>

      {/* 기도의 자리 시작 버튼 */}
      <section className="action-section">
        <button className="btn-primary-action" onClick={startTimer}>
          <span>🌿</span> 기도의 자리 나아가기 (타이머)
        </button>
        <button className="btn-secondary-action" onClick={() => setShowManualModal(true)}>
          ✍️ 기도 시간 직접 기록하기
        </button>
      </section>

      {/* 피드 피드백 영역 */}
      <section className="feed-section">
        <div className="feed-header">
          <h2>동역자의 은혜 나누기</h2>
          <span className="feed-badge">실시간</span>
        </div>
        
        <div className="feed-list">
          {prayerFeed.map((log) => {
            const hasLiked = likedCards[log.id];
            return (
              <div key={log.id} className={`feed-card ${log.isUser ? 'highlight-card' : ''}`}>
                <div className="feed-card-header">
                  <div className="feed-user-info">
                    <div className="user-avatar">
                      {log.name.slice(0, 2)}
                    </div>
                    <span className="feed-user-name">{log.name}</span>
                  </div>
                  <span className="feed-prayer-time">⏱️ {log.minutes}분 기도</span>
                </div>
                <p className="feed-memo">{log.memo}</p>
                <div className="feed-card-footer">
                  <span>{getRelativeTimeString(log.timestamp)}</span>
                  <button 
                    onClick={() => toggleLike(log.id)} 
                    className={`feed-heart-btn ${hasLiked ? 'active' : ''}`}
                  >
                    ❤️ {hasLiked ? '응원 완료!' : '기도 응원'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 1. 타이머 오버레이 */}
      {isTimerRunning && (
        <div className="timer-overlay">
          <div className="timer-header">
            <h2>로뎀나무 아래 머무는 시간</h2>
            <p>조용히 눈을 감고 마음을 주님께 집중해보세요.</p>
          </div>

          <div className="timer-center">
            <div className="leaf-animation-container">
              <div className="pulse-ring"></div>
              <div className="leaf-icon">🌳</div>
            </div>
            <div className="timer-digits">
              {formatTime(elapsedSeconds)}
            </div>
          </div>

          <div className="timer-actions">
            <button className="btn-complete-prayer" onClick={openCompletionModal}>
              기도 마치기
            </button>
            <button className="btn-cancel-prayer" onClick={cancelTimer}>
              측정 취소
            </button>
          </div>
        </div>
      )}

      {/* 2. 타이머 완료 후 기록 모달 */}
      {showCompleteModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>기도 시간 등록 🌿</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              측정된 시간: <strong>{Math.max(1, Math.round(elapsedSeconds / 60))}분</strong>
            </p>
            <div>
              <label className="input-label">오늘의 짧은 소감이나 기도 나눔 (선택)</label>
              <textarea
                placeholder="오늘 기도의 시간에 느낀 마음이나 감사 제목을 가볍게 나눠보세요."
                className="textarea-field"
                value={completeMemo}
                onChange={(e) => setCompleteMemo(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowCompleteModal(false);
                  // 타이머가 멈춘 상태에서 모달만 닫혔으므로, 다시 타이머를 재개시킴
                  timerRef.current = setInterval(() => {
                    setElapsedSeconds((prev) => prev + 1);
                  }, 1000);
                }}
              >
                돌아가기
              </button>
              <button className="btn-save" onClick={saveTimerPrayer}>
                로뎀나무에 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 직접 입력 모달 */}
      {showManualModal && (
        <div className="modal-backdrop" onClick={() => setShowManualModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>기도 직접 기록하기</h3>
            <form onSubmit={handleManualSave}>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">기도 시간 (분 단위)</label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  className="input-field"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(Math.max(1, Number(e.target.value)))}
                  required
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="input-label">오늘의 기도 나눔 (선택)</label>
                <textarea
                  placeholder="오늘 기도를 통해 느낀 짧은 소감이나 은혜를 기록해보세요."
                  className="textarea-field"
                  value={manualMemo}
                  onChange={(e) => setManualMemo(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowManualModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn-save">
                  기록 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
