// 기존: import studyList from './studyData.js';
// 변경: studyData.js는 API 로딩 실패 시 예비용(fallback)으로 두거나 제거
import React, { useState, useEffect, useMemo, useRef } from 'react';
import fallbackStudyList from './studyData.js';
import AdminRecipeModal from './AdminRecipeModal.jsx'; // ✨ 모달 파일 import

// ----------------------------------------------------
// 🎮 [컴포넌트] 스피드 암기 게임 (1회독 완주 & 결과 리포트 구조)
// ----------------------------------------------------
function SpecQuizGame({ studyList }) {
  // 출제할 품목 큐 (셔플된 리스트)
  const [quizQueue, setQuizQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);

  // 현재 품목의 단계: 0: 반죽법, 1: 반죽온도, 2: 비중, 3: 오븐온도, 4: 오븐시간
  const [stageIndex, setStageIndex] = useState(0);
  const [answeredSlots, setAnsweredSlots] = useState([null, null, null, null, null]);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // 채점 및 리포트 상태
  const [currentStageAttempts, setCurrentStageAttempts] = useState(0); // 현재 단계 시도 횟수
  const [perfectCount, setPerfectCount] = useState(0); // 첫 시도 정답 단계 수 (총 5 * 품목수)
  const [weakRecipeIds, setWeakRecipeIds] = useState(new Set()); // 재도전이 발생한 취약 품목 ID
  const [isGameOver, setIsGameOver] = useState(false);

  // 5대 스펙 단계 정의
  const STAGES = [
    { key: 'mixingMethod', label: '반죽법', extract: (r) => r.spec?.mixingMethod || '-' },
    { key: 'doughTemp', label: '반죽온도', extract: (r) => r.spec?.doughTemp?.replace(/℃/g, '').trim() ? `${r.spec.doughTemp.replace(/℃/g, '').trim()}℃` : '-' },
    { key: 'specificGravity', label: '비중', extract: (r) => (r.spec?.specificGravity && r.spec.specificGravity !== '-') ? r.spec.specificGravity.replace(/\s+/g, '') : '-' },
    { key: 'ovenTemp', label: '오븐온도', extract: (r) => r.spec?.ovenTemp ? `${r.spec.ovenTemp.replace(/℃/g, '').replace(/\s+/g, '')}℃` : '-' },
    { key: 'bakingTime', label: '오븐시간', extract: (r) => r.spec?.bakingTime ? `${r.spec.bakingTime.replace(/분/g, '').replace(/\s+/g, '')}분` : '-' },
  ];

  // 퀴즈 큐 초기화 함수
  const initQuiz = (targetList) => {
    const list = targetList && targetList.length > 0 ? targetList : studyList;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setQuizQueue(shuffled);
    setQueueIndex(0);
    setStageIndex(0);
    setAnsweredSlots([null, null, null, null, null]);
    setFeedbackMessage('');
    setCurrentStageAttempts(0);
    setPerfectCount(0);
    setWeakRecipeIds(new Set());
    setIsGameOver(false);
  };

  useEffect(() => {
    if (studyList && studyList.length > 0) {
      initQuiz(studyList);
    }
  }, [studyList]);

  const currentRecipe = quizQueue[queueIndex] || null;

  // 4지선다 선택지 생성 (정답 1개 + 타 품목 데이터 중 무작위 3개)
  const currentOptions = useMemo(() => {
    if (!currentRecipe) return [];

    const currentStage = STAGES[stageIndex];
    if (!currentStage) return [];

    const correctAnswer = currentStage.extract(currentRecipe);

    // 전체 품목에서 고유한 다른 값들 수집
    const pool = Array.from(new Set(
      studyList
        .map(r => currentStage.extract(r))
        .filter(val => val && val !== correctAnswer)
    ));

    const shuffledWrong = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...shuffledWrong, correctAnswer].sort(() => Math.random() - 0.5);
  }, [currentRecipe, stageIndex, studyList]);

  // 선택지 터치 핸들러 (틀려도 버튼을 지우지 않고 원래 모습 유지)
  const handleChoice = (option) => {
    const currentStage = STAGES[stageIndex];
    const correctAnswer = currentStage.extract(currentRecipe);

    if (option === correctAnswer) {
      // 🎯 정답을 맞힌 경우
      if (currentStageAttempts === 0) {
        setPerfectCount(p => p + 1); // 첫 시도 정답 기록
      }

      setAnsweredSlots(prev => {
        const next = [...prev];
        next[stageIndex] = correctAnswer;
        return next;
      });

      setFeedbackMessage('정답입니다!');
      setCurrentStageAttempts(0);

      setTimeout(() => {
        setFeedbackMessage('');
        if (stageIndex < 4) {
          // 다음 스펙 항목으로 진행
          setStageIndex(s => s + 1);
        } else {
          // 5개 스펙 모두 완료 -> 다음 품목 또는 완주 처리
          if (queueIndex + 1 < quizQueue.length) {
            setQueueIndex(q => q + 1);
            setStageIndex(0);
            setAnsweredSlots([null, null, null, null, null]);
          } else {
            // 1회독 완주!
            setIsGameOver(true);
          }
        }
      }, 350);

    } else {
      // ❌ 틀린 경우: 버튼 지우지 않고 원래 모양 유지, "다시 골라보세요."만 노출
      setFeedbackMessage('다시 골라보세요.');
      setCurrentStageAttempts(a => a + 1);
      // 취약 품목 기록
      setWeakRecipeIds(prev => new Set(prev).add(currentRecipe.id));
    }
  };

  // 취약 품목들만 모아서 재시험
  const retryWeakOnly = () => {
    const weakList = studyList.filter(item => weakRecipeIds.has(item.id));
    if (weakList.length > 0) {
      initQuiz(weakList);
    }
  };

  // 전체 품목 처음부터 다시 시작
  const restartAll = () => {
    initQuiz(studyList);
  };

  // 🏁 1회독 완주 후 결과 리포트 화면
  if (isGameOver) {
    const totalStages = quizQueue.length * 5;
    const finalScore = Math.round((perfectCount / totalStages) * 100);
    const weakItems = studyList.filter(item => weakRecipeIds.has(item.id));

    return (
      <div style={{
        backgroundColor: '#ffffff',
        border: '2px solid #86efac',
        borderRadius: '14px',
        padding: '24px 18px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(15, 118, 110, 0.08)'
      }}>
        <div>
          <span style={{ fontSize: '32px' }}>🏆</span>
          <h2 style={{ fontSize: '20px', color: '#0f766e', margin: '6px 0 2px 0', fontWeight: 'bold' }}>
            1회독 완주 완료!
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            총 {quizQueue.length}개 품목의 5대 스펙을 완주하셨습니다.
          </p>
        </div>

        {/* 최종 점수 배너 */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1.5px solid #bbf7d0',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>정답 적중률 (100점 만점)</span>
          <span style={{ fontSize: '38px', fontWeight: 'bold', color: '#0f766e' }}>
            {finalScore}점
          </span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            한 번에 맞힌 항목: {perfectCount} / {totalStages}
          </span>
        </div>

        {/* 취약 품목 리포트 */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
            📋 집중 복습이 필요한 품목 ({weakItems.length}개)
          </div>
          {weakItems.length === 0 ? (
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#166534', textAlign: 'center', fontWeight: 'bold' }}>
              🎉 모든 품목의 수치를 한 번에 맞추셨습니다!
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              backgroundColor: '#f8fafc',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              {weakItems.map(item => (
                <span
                  key={item.id}
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    fontSize: '12px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    border: '1px solid #fca5a5'
                  }}
                >
                  {item.title}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 재도전 버튼 영역 */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          {weakItems.length > 0 && (
            <button
              onClick={retryWeakOnly}
              style={{
                flex: 1,
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '12px 6px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
              }}
            >
              📝 취약 품목만 다시 풀기
            </button>
          )}
          <button
            onClick={restartAll}
            style={{
              flex: 1,
              backgroundColor: '#0f766e',
              color: '#ffffff',
              border: 'none',
              padding: '12px 6px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)'
            }}
          >
            🔄 전체 다시 도전
          </button>
        </div>
      </div>
    );
  }

  if (!currentRecipe) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. 상단: 출제 품목 카드 & 진행도 */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '2px solid #bbf7d0',
        borderRadius: '14px',
        padding: '16px 14px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(15, 118, 110, 0.08)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            진행도: {queueIndex + 1} / {quizQueue.length}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            완주까지 {quizQueue.length - (queueIndex + 1)}개 남음
          </span>
        </div>

        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b' }}>
          {currentRecipe.title}
        </div>

        {/* 5대 슬롯 게이지 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '4px',
          marginTop: '14px'
        }}>
          {STAGES.map((st, idx) => {
            const isDone = answeredSlots[idx] !== null;
            const isCurrent = stageIndex === idx;

            return (
              <div 
                key={st.key}
                style={{
                  backgroundColor: isDone ? '#f0fdf4' : (isCurrent ? '#fefce8' : '#f8fafc'),
                  border: isDone ? '1.5px solid #86efac' : (isCurrent ? '1.5px solid #facc15' : '1px dashed #cbd5e1'),
                  borderRadius: '6px',
                  padding: '6px 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: '44px',
                  justifyContent: 'center'
                }}
              >
                <span style={{ fontSize: '9.5px', color: '#64748b', marginBottom: '2px' }}>
                  {st.label}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: isDone ? '#0f766e' : '#94a3b8',
                  wordBreak: 'break-all',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {answeredSlots[idx] || (isCurrent ? '?' : '-')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 하단: 사지선다 선택지 (틀려도 형태 유지, 다시 고르게 함) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1.5px solid #e2e8f0',
        padding: '14px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f766e' }}>
            👉 [ {STAGES[stageIndex].label} ] 선택하세요 ({stageIndex + 1}/5)
          </span>
          {feedbackMessage && (
            <span style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: feedbackMessage.includes('정답') ? '#16a34a' : '#dc2626'
            }}>
              {feedbackMessage}
            </span>
          )}
        </div>

        {/* 4지선다 버튼 그리드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px'
        }}>
          {currentOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleChoice(opt)}
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#1e293b',
                padding: '12px 6px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'border-color 0.15s ease, transform 0.1s ease',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                wordBreak: 'break-all'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0f766e')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ----------------------------------------------------
// 🎲 [컴포넌트] 테스트모드용 공정 순서 맞추기 뽑기통 게임
// ----------------------------------------------------
function StepFlowTestGame({ steps, itemId }) {
  const [capsulePool, setCapsulePool] = useState([]);
  const [placedSlots, setPlacedSlots] = useState([]);

  useEffect(() => {
    resetGame();
  }, [steps, itemId]);

  const resetGame = () => {
    const shuffled = [...steps]
      .map(item => ({ ...item, randomTilt: (Math.random() - 0.5) * 16 }))
      .sort(() => Math.random() - 0.5);

    setCapsulePool(shuffled);
    setPlacedSlots(new Array(steps.length).fill(null));
  };

  const placeCapsuleIntoSlot = (capsule, targetIndex) => {
    const currentOccupant = placedSlots[targetIndex];
    let newPool = capsulePool.filter(c => c.id !== capsule.id);
    if (currentOccupant) {
      newPool.push(currentOccupant);
    }

    const newPlaced = placedSlots.map((item, idx) => {
      if (idx === targetIndex) return capsule;
      if (item && item.id === capsule.id) return null;
      return item;
    });

    setCapsulePool(newPool);
    setPlacedSlots(newPlaced);
  };

  const returnToPool = (slotIndex) => {
    const item = placedSlots[slotIndex];
    if (!item) return;

    setPlacedSlots(prev => prev.map((s, idx) => (idx === slotIndex ? null : s)));
    setCapsulePool(prev => [...prev, item]);
  };

  const findFirstEmptySlot = () => {
    return placedSlots.findIndex(slot => slot === null);
  };

  const handleCapsuleClick = (capsule) => {
    const firstEmpty = findFirstEmptySlot();
    if (firstEmpty !== -1) {
      placeCapsuleIntoSlot(capsule, firstEmpty);
    }
  };

  const isFilled = placedSlots.length > 0 && placedSlots.every(s => s !== null);
  const isAllCorrect = isFilled && placedSlots.every((step, idx) => step && step.id === idx);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1.5px solid #bae6fd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0369a1' }}>
            🎯 순서대로 배치하세요 ({placedSlots.filter(Boolean).length} / {steps.length})
          </div>
          <button 
            onClick={resetGame}
            style={{ 
              border: 'none', 
              backgroundColor: '#e0f2fe', 
              color: '#0369a1', 
              padding: '4px 10px', 
              borderRadius: '6px', 
              fontSize: '11px', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            🔄 다시 섞기
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '10px 8px', 
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '6px 2px 4px 2px'
        }}>
          {steps.map((_, idx) => {
            const placed = placedSlots[idx];
            const isCorrectSlot = placed && placed.id === idx;

            return (
              <div
                key={idx}
                onClick={() => placed && returnToPool(idx)}
                style={{
                  position: 'relative',
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  border: placed 
                    ? (isFilled ? (isCorrectSlot ? '2.5px solid #22c55e' : '2.5px solid #ef4444') : '2.5px solid #0284c7') 
                    : '2px dashed #cbd5e1',
                  backgroundColor: placed ? '#f0f9ff' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: placed ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  boxShadow: placed ? '0 2px 6px rgba(2, 132, 199, 0.2)' : 'none',
                  boxSizing: 'border-box',
                  padding: '2px',
                  flexShrink: 0
                }}
                title={placed ? '터치하면 뽑기통으로 복귀합니다' : `${idx + 1}단계 슬롯`}
              >
                {placed && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: isFilled ? (isCorrectSlot ? '#22c55e' : '#ef4444') : '#0284c7',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    padding: '0 5px',
                    borderRadius: '8px',
                    lineHeight: '13px',
                    zIndex: 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    whiteSpace: 'nowrap'
                  }}>
                    {idx + 1}
                  </span>
                )}

                {placed ? (
                  <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
                    {placed.nameLines.map((line, lIdx) => (
                      <div 
                        key={lIdx} 
                        style={{ 
                          fontSize: placed.nameLines.length > 1 ? '10px' : '11px', 
                          fontWeight: 'bold', 
                          color: '#0369a1',
                          maxWidth: '44px',
                          wordBreak: 'break-all'
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ 
                    fontSize: '16px', 
                    color: '#94a3b8', 
                    fontWeight: 'bold', 
                    userSelect: 'none',
                    opacity: 0.85
                  }}>
                    {idx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        backgroundColor: '#f1f5f9',
        border: '3px solid #cbd5e1',
        borderRadius: '18px',
        padding: '14px',
        position: 'relative',
        minHeight: '120px',
        boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
              🎰 캡슐 뽑기통
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              (터치하여 슬롯에 넣으세요)
            </span>
          </div>

          <span style={{ 
            fontSize: '11px', 
            color: '#0369a1', 
            fontWeight: 'bold', 
            backgroundColor: '#e0f2fe', 
            padding: '3px 8px', 
            borderRadius: '10px',
            flexShrink: 0
          }}>
            남은 캡슐: {capsulePool.length}개
          </span>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px'
        }}>
          {capsulePool.map((capsule) => (
            <div
              key={capsule.id}
              onClick={() => handleCapsuleClick(capsule)}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%)',
                border: '2px solid #38bdf8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                boxShadow: '0 3px 8px rgba(14, 165, 233, 0.22)',
                transform: `rotate(${capsule.randomTilt || 0}deg)`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                padding: '3px',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = `rotate(${capsule.randomTilt || 0}deg)`)}
            >
              {capsule.nameLines.map((line, lIdx) => (
                <span
                  key={lIdx}
                  style={{
                    fontSize: capsule.nameLines.length > 1 ? '10px' : '11px',
                    fontWeight: 'bold',
                    color: '#0369a1',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    maxWidth: '44px',
                    wordBreak: 'break-all'
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
          ))}

          {capsulePool.length === 0 && !isAllCorrect && (
            <div style={{ color: '#64748b', fontSize: '12.5px', fontWeight: 'bold', padding: '12px 0', textAlign: 'center' }}>
              모든 캡슐이 배치되었습니다. 빨간색 슬롯을 터치하여 다시 조정해보세요!
            </div>
          )}
        </div>

        {isAllCorrect && (
          <div style={{
            marginTop: '12px',
            backgroundColor: '#dcfce7',
            border: '2px solid #4ade80',
            borderRadius: '12px',
            padding: '10px',
            textAlign: 'center',
            color: '#166534',
            fontWeight: 'bold',
            fontSize: '13.5px'
          }}>
            🎉 축하합니다! 완벽하게 순서를 맞추셨습니다!
          </div>
        )}
      </div>

    </div>
  );
}

// ----------------------------------------------------
// 🧰 [컴포넌트] 전체 준비물 체크리스트 및 품목별 준비물 뷰
// ----------------------------------------------------
function EquipmentListView({ studyList, onSelectRecipe, onSelectRecipeWithTool }) {
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' (전체 체크리스트) | 'byItem' (품목별)
  const QNET_DEFAULT_ITEMS = [
    '계산기',
    '고무주걱',
    '국자',
    '나무주걱',
    '마스크',
    '보자기(면60*60cm)',
    '분무기',
    '붓',
    '수세미',
    '스쿱',
    '실리콘페이퍼(테프론시트)',
    '오븐장갑',
    '온도계',
    '용기(스텐또는 플라스틱)',
    '위생모',
    '위생복',
    '자',
    '작업화',
    '저울',
    '주걱',
    '짤주머니',
    '칼',
    '행주',
    '흑색볼펜'
  ];

  const [customItems, setCustomItems] = useState(() => {
    try {
      const saved = localStorage.getItem('my_personal_equipments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newItemText, setNewItemText] = useState('');
  const [checkedMap, setCheckedMap] = useState(() => {
    try {
      const saved = localStorage.getItem('checked_equipments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // ✨ 큐넷 준비물 중 챙기지 않을 항목 관리 상태 (true면 안 챙김/제외)
  const [excludedQnetMap, setExcludedQnetMap] = useState(() => {
    try {
      const saved = localStorage.getItem('excluded_qnet_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // 챙길 품목만 보기 필터 상태
  const [onlyIncludedQnet, setOnlyIncludedQnet] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('my_personal_equipments', JSON.stringify(customItems));
    } catch (e) {}
  }, [customItems]);

  useEffect(() => {
    try {
      localStorage.setItem('checked_equipments', JSON.stringify(checkedMap));
    } catch (e) {}
  }, [checkedMap]);

  useEffect(() => {
    try {
      localStorage.setItem('excluded_qnet_items', JSON.stringify(excludedQnetMap));
    } catch (e) {}
  }, [excludedQnetMap]);

  // 각 품목별 도구 추출 맵 & 전체 고유 도구 목록 추출
  const { allUniqueTools, recipeToolMap } = useMemo(() => {
    const map = {};
    const set = new Set();

    (studyList || []).forEach(recipe => {
      const text = `${recipe.summary || ''} ${recipe.keyPoint ? (Array.isArray(recipe.keyPoint) ? recipe.keyPoint.join(' ') : recipe.keyPoint) : ''} ${recipe.detail || ''}`;
      const tools = [];
      const uRegex = /<u>(.*?)<\/u>/gi;
      let match;
      while ((match = uRegex.exec(text)) !== null) {
        if (match[1]?.trim()) tools.push(match[1].trim());
      }
      const underRegex = /_([^_]+)_/g;
      while ((match = underRegex.exec(text)) !== null) {
        if (match[1]?.trim()) tools.push(match[1].trim());
      }
      const uniqueTools = Array.from(new Set(tools));
      map[recipe.id] = { title: recipe.title, tools: uniqueTools };
      uniqueTools.forEach(t => set.add(t));
    });

    return {
      allUniqueTools: Array.from(set).sort((a, b) => a.localeCompare(b, 'ko')),
      recipeToolMap: map
    };
  }, [studyList]);

  const handleToggleCheck = (name) => {
    setCheckedMap(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // 큐넷 항목 가져갈지 말지 선택 토글
  const handleToggleQnetInclusion = (toolName) => {
    setExcludedQnetMap(prev => {
      const isCurrentlyExcluded = !!prev[toolName];
      const next = { ...prev, [toolName]: !isCurrentlyExcluded };
      // 안 챙기기로 변경 시 체크 상태도 해제
      if (!isCurrentlyExcluded) {
        setCheckedMap(cPrev => ({ ...cPrev, [toolName]: false }));
      }
      return next;
    });
  };

  // ✨ 길게 누르기(롱프레스, 450ms) 제어용 Ref 및 타임스탬프
  const longPressTimerRef = useRef(null);
  const pressStartTimeRef = useRef(0);
  const lastLongPressTimeRef = useRef(0);

  const startLongPress = (toolName) => {
    pressStartTimeRef.current = Date.now();
    longPressTimerRef.current = setTimeout(() => {
      lastLongPressTimeRef.current = Date.now();
      handleToggleQnetInclusion(toolName);
    }, 450); // 0.45초간 꾹 누르면 지참/미지참 전환
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClickItem = (toolName, isExcluded) => {
    // 롱프레스가 실행된 지 800ms 이내에 발생하는 후속 클릭 이벤트는 완전히 차단
    if (Date.now() - lastLongPressTimeRef.current < 800) {
      return;
    }
    // 실제로 400ms 이상 누르고 있었다면 단순 클릭으로 간주하지 않음
    if (Date.now() - pressStartTimeRef.current >= 400) {
      return;
    }
    if (!isExcluded) {
      handleToggleCheck(toolName);
    }
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    if (!customItems.includes(trimmed) && !QNET_DEFAULT_ITEMS.includes(trimmed)) {
      setCustomItems(prev => [...prev, trimmed]);
    }
    setNewItemText('');
  };

  const handleRemoveCustom = (itemToRemove) => {
    setCustomItems(prev => prev.filter(item => item !== itemToRemove));
    setCheckedMap(prev => {
      const next = { ...prev };
      delete next[itemToRemove];
      return next;
    });
  };

  // 1. 큐넷 수험자지참물 (실제 챙기기로 한 항목만 활성 품목으로 집계)
  const qnetItems = QNET_DEFAULT_ITEMS;
  const activeQnetItems = qnetItems.filter(t => !excludedQnetMap[t]);

  // 2. 그 외 내가 따로 챙겨갈 물건 & 품목별 추출 도구 (큐넷 기본 항목과 중복 제거)
  const otherItems = [
    ...customItems,
    ...allUniqueTools.filter(t => !customItems.includes(t) && !QNET_DEFAULT_ITEMS.includes(t))
  ];

  // 총 챙길 대상 수 = (큐넷 중 챙기기로 한 항목 수) + (그 외 챙길 항목 수)
  const totalCount = activeQnetItems.length + otherItems.length;
  const checkedTotalCount = [...activeQnetItems, ...otherItems].filter(t => checkedMap[t]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      {/* 서브 탭 전환 버튼 */}
      <div style={{
        display: 'flex',
        gap: '6px',
        width: '100%',
        justifyContent: 'space-between',
        paddingBottom: '2px',
        boxSizing: 'border-box'
      }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('all')}
          style={{
            flex: 1,
            border: activeSubTab === 'all' ? '1.5px solid #0f766e' : '1px solid #bbf7d0',
            backgroundColor: activeSubTab === 'all' ? '#0f766e' : '#ffffff',
            color: activeSubTab === 'all' ? '#ffffff' : '#334155',
            borderRadius: '8px',
            padding: '7px 4px',
            fontSize: '12.5px',
            fontWeight: activeSubTab === 'all' ? 'bold' : '500',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: activeSubTab === 'all' ? '0 2px 6px rgba(15, 118, 110, 0.25)' : 'none',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          📋 전체 리스트 ({checkedTotalCount}/{totalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('byItem')}
          style={{
            flex: 1,
            border: activeSubTab === 'byItem' ? '1.5px solid #0f766e' : '1px solid #bbf7d0',
            backgroundColor: activeSubTab === 'byItem' ? '#0f766e' : '#ffffff',
            color: activeSubTab === 'byItem' ? '#ffffff' : '#334155',
            borderRadius: '8px',
            padding: '7px 4px',
            fontSize: '12.5px',
            fontWeight: activeSubTab === 'byItem' ? 'bold' : '500',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: activeSubTab === 'byItem' ? '0 2px 6px rgba(15, 118, 110, 0.25)' : 'none',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          🥐 제품별 준비물 
        </button>
      </div>

      {/* 1. 전체 체크리스트 화면 */}
      {activeSubTab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* 큐넷 공식 안내 배너 & 링크 */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>📌</span>
              <span style={{ fontSize: '12px',  color: '#166534' }}>
                큐넷 공식 수험자 지참준비물
              </span>
            </div>
            <a
              href="https://www.q-net.or.kr/rcv013.do?id=rcv01314s01&&gSite=Q&gId=&JM_CD=7892&JM_FLD_NM=%EC%A0%9C%EA%B3%BC%EA%B8%B0%EB%8A%A5%EC%82%AC&SELFLD_CD=00&SERIES_CD=04&IMPL_ID=&sel_yy=2026&hh=0&gyul=05"
              target="_blank"
              rel="noreferrer"
              style={{
                backgroundColor: '#0f766e',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              큐넷 확인하기 ↗
            </a>
          </div>

          {/* 1구역: 수험자지참물(큐넷) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f766e', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>📋</span> 수험자지참물(큐넷)
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                  ({activeQnetItems.filter(t => checkedMap[t]).length} / {activeQnetItems.length}개 챙김)
                </span>
              </div>

              {/* 가져갈 것만 보기 필터 버튼 (동작형 버튼 스타일 적용) */}
              <button
                type="button"
                onClick={() => setOnlyIncludedQnet(!onlyIncludedQnet)}
                style={{
                  backgroundColor: onlyIncludedQnet ? '#0f766e' : '#ffffff',
                  color: onlyIncludedQnet ? '#ffffff' : '#0f766e',
                  border: onlyIncludedQnet ? '1.5px solid #0f766e' : '1.5px solid #86efac',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: onlyIncludedQnet ? '0 2px 5px rgba(15, 118, 110, 0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {onlyIncludedQnet ? '📑 전체 24개 보기' : '👀 챙길 것만 보기'}
              </button>
            </div>

            {/* ✨ 길게 누르기 사용법 팁 안내 문구 (눈에 띄는 노란색 배경 적용) */}
            <div style={{
              fontSize: '12.5px',
              color: '#854d0e',
              backgroundColor: '#fef9c3',
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px dashed #facc15',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              lineHeight: '1.4'
            }}>
              <span>💡</span>
              <span>
                안 가져갈 <b>항목을 0.5초간 꾹 길게 누르면</b> 제외/복원됨
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '6px',
              backgroundColor: '#ffffff',
              padding: '10px 8px',
              borderRadius: '10px',
              border: '1.5px solid #bbf7d0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              {qnetItems
                .filter(tool => (onlyIncludedQnet ? !excludedQnetMap[tool] : true))
                .map((tool) => {
                  const isExcluded = !!excludedQnetMap[tool];
                  const isChecked = !!checkedMap[tool];

                  return (
                    <div
                      key={tool}
                      onClick={() => handleClickItem(tool, isExcluded)}
                      onMouseDown={() => startLongPress(tool)}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                      onTouchStart={() => startLongPress(tool)}
                      onTouchEnd={cancelLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isExcluded ? '#f8fafc' : (isChecked ? '#f0fdf4' : '#ffffff'),
                        border: isExcluded ? '1px dashed #cbd5e1' : (isChecked ? '1.5px solid #86efac' : '1px solid #cbd5e1'),
                        borderRadius: '8px',
                        padding: '8px 6px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        WebkitTouchCallout: 'none', // 모바일 롱프레스 시 브라우저 기본 컨텍스트 메뉴 방지
                        transition: 'all 0.15s ease',
                        opacity: isExcluded ? 0.55 : 1,
                        minWidth: 0,
                        boxSizing: 'border-box'
                      }}
                      title="터치: 체크 / 0.5초 꾹 누름: 챙길 품목에서 제외 또는 복원"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                        <input
                          type="checkbox"
                          disabled={isExcluded}
                          checked={isChecked}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: isExcluded ? 'not-allowed' : 'pointer', width: '15px', height: '15px', flexShrink: 0 }}
                        />
                        <span style={{
                          fontSize: tool.length >= 10 ? '10.5px' : (tool.length >= 7 ? '11.5px' : '12.5px'),
                          color: isExcluded ? '#94a3b8' : (isChecked ? '#166534' : '#1e293b'),
                          textDecoration: (isExcluded || isChecked) ? 'line-through' : 'none',
                          fontWeight: (isChecked && !isExcluded) ? 'bold' : '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: tool.length >= 10 ? '-0.5px' : '-0.2px',
                          lineHeight: '1.2'
                        }}>
                          {tool}
                        </span>
                      </div>

                      {/* 미지참(제외) 상태일 때만 은은하게 작게 표시되는 텍스트 배지 */}
                      {isExcluded && (
                        <span style={{
                          fontSize: '9.5px',
                          color: '#94a3b8',
                          backgroundColor: '#f1f5f9',
                          padding: '1px 3px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          marginLeft: '2px'
                        }}>
                          제외됨
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 2구역: 그 외 내가 따로 챙겨갈 물건 & 실습 도구 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>🎒</span> 그 외 내가 따로 챙겨갈 물건
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                {otherItems.filter(t => checkedMap[t]).length} / {otherItems.length}
              </span>
            </div>

            {/* 직접 입력 폼 */}
            <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                placeholder="추가로 챙길 물건 직접 입력 (예: 물티슈, 펜, 보조배터리 등)"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                ➕ 추가
              </button>
            </form>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '6px',
              backgroundColor: '#ffffff',
              padding: '10px 8px',
              borderRadius: '10px',
              border: '1.5px solid #bae6fd',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              {otherItems.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '12px', padding: '6px', gridColumn: '1 / -1', textAlign: 'center' }}>
                  따로 챙길 물건을 위 입력창에서 추가해 보세요.
                </div>
              ) : (
                otherItems.map((tool) => {
                  const isChecked = !!checkedMap[tool];
                  const isCustom = customItems.includes(tool);

                  return (
                    <div
                      key={tool}
                      onClick={() => handleToggleCheck(tool)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isChecked ? '#f0fdf4' : '#f8fafc',
                        border: isChecked ? '1.5px solid #86efac' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 6px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s ease',
                        minWidth: 0,
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', width: '15px', height: '15px', flexShrink: 0 }}
                        />
                        <span style={{
                          fontSize: tool.length >= 10 ? '10.5px' : (tool.length >= 7 ? '11.5px' : '12.5px'),
                          color: isChecked ? '#166534' : '#1e293b',
                          textDecoration: isChecked ? 'line-through' : 'none',
                          fontWeight: isChecked ? 'bold' : '500',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          letterSpacing: tool.length >= 10 ? '-0.5px' : '-0.2px',
                          lineHeight: '1.2'
                        }}>
                          {tool}
                        </span>
                      </div>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCustom(tool);
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#ef4444',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '0 2px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}
                          title="직접 추가한 항목 삭제"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. 제품(품목)별 준비물 화면 */}
      {activeSubTab === 'byItem' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
            <span style={{ lineHeight: '1.4' }}>💡</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.4' }}>
              <span>품목명을 누르면 해당 노트로 이동</span>
              <span>준비물을 누르면 해당 노트로 이동</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {studyList.map(item => {
              const info = recipeToolMap[item.id] || { title: item.title, tools: [] };
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    boxShadow: '0 1px 3px rgba(15, 118, 110, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <button
                      type="button"
                      onClick={() => onSelectRecipe(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '13.5px',
                        fontWeight: 'bold',
                        color: '#0f766e',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                      title="공부노트로 이동"
                    >
                      🥐 {item.title}
                    </button>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      도구 {info.tools.length}개
                    </span>
                  </div>

                  {info.tools.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>등록된 특수 준비 도구가 없습니다.</span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {info.tools.map((t, idx) => (
                        <span
                          key={idx}
                          onClick={() => onSelectRecipeWithTool ? onSelectRecipeWithTool(item.id, t) : onSelectRecipe(item.id)}
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #7dd3fc',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                          title={`클릭 시 [${t}]가 사용되는 공정 단계로 이동`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 🧭 [컴포넌트] 공정플로우 뷰
// ----------------------------------------------------
function StepFlowView({ contentData, renderFormattedNotes, mode, itemId, onOpenEquipmentView, initialStep = 0, highlightWord = '' }) {
  const [activeStep, setActiveStep] = useState(initialStep);
  const stepRefs = useRef([]);

  const steps = useMemo(() => {
    if (!contentData) return [];

    let text = Array.isArray(contentData)
      ? contentData.map(item => (typeof item === 'string' ? item : item.text)).join('\n')
      : String(contentData);

    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');

    const rawBlocks = text.split(/(?=###\s+|(?<=\n)\[\d+(?:단계)?\])/g).filter(b => b.trim());

    if (rawBlocks.length === 0) return [];

    return rawBlocks.map((block, idx) => {
      const lines = block.trim().split('\n');
      const firstLine = lines[0].replace(/^###\s+/, '').trim();

      const match = firstLine.match(/\[(.*?)\]\s*(.*)/);
      let rawBadge = match ? match[1] : `${idx + 1}단계`;
      // [1] 형태일 경우 [1단계]로 자동 확장
      const badge = /^\d+$/.test(rawBadge.trim()) ? `${rawBadge.trim()}단계` : rawBadge;
      let title = match ? (match[2] || '공정') : firstLine;
      const body = lines.slice(1).join('\n').trim();

      let customKeyword = null;
      const parenMatch = title.match(/\((.*?)\)/);
      if (parenMatch) {
        customKeyword = parenMatch[1].trim();
        title = title.replace(/\(.*?\)/g, '').trim();
      }

      const rawShortName = customKeyword || title.split(' ')[0] || `공정${idx + 1}`;
      const nameLines = rawShortName.includes(',')
        ? rawShortName.split(',').map(s => s.trim()).filter(Boolean)
        : [rawShortName];

      return {
        id: idx,
        badge,
        title,
        nameLines,
        body
      };
    });
  }, [contentData]);

  // 본문 전체에서 <u>도구</u> 또는 _도구_ 형식으로 밑줄 친 단어 자동 추출 및 중복 제거
  const extractedTools = useMemo(() => {
    if (!contentData) return [];
    let text = Array.isArray(contentData)
      ? contentData.map(item => (typeof item === 'string' ? item : item.text)).join('\n')
      : String(contentData);

    const tools = [];
    const uRegex = /<u>(.*?)<\/u>/gi;
    let match;
    while ((match = uRegex.exec(text)) !== null) {
      if (match[1]?.trim()) tools.push(match[1].trim());
    }
    const underRegex = /_([^_]+)_/g;
    while ((match = underRegex.exec(text)) !== null) {
      if (match[1]?.trim()) tools.push(match[1].trim());
    }
    return Array.from(new Set(tools));
  }, [contentData]);

  useEffect(() => {
    const target = (typeof initialStep === 'number' && initialStep >= 0) ? initialStep : 0;
    setActiveStep(target);
    if (stepRefs.current[target]) {
      stepRefs.current[target].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [contentData, mode, itemId, initialStep]);

  if (steps.length === 0) return null;

  if (mode === 'test') {
    return <StepFlowTestGame steps={steps} itemId={itemId} />;
  }

  const handleStepClick = (idx) => {
    setActiveStep(idx);
    if (stepRefs.current[idx]) {
      stepRefs.current[idx].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
      <div 
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '6px 2px 10px 2px',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {steps.map((step, idx) => {
          const isSelected = activeStep === idx;

          return (
            <div
              key={step.id}
              ref={el => (stepRefs.current[idx] = el)}
              onClick={() => handleStepClick(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                userSelect: 'none'
              }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: isSelected ? '#0284c7' : '#ffffff',
                border: isSelected ? '2.5px solid #38bdf8' : '2px solid #bae6fd',
                color: isSelected ? '#ffffff' : '#0369a1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSelected ? '0 4px 10px rgba(2, 132, 199, 0.35)' : '0 2px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.2s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                padding: '3px',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {step.nameLines.map((lineText, lineIdx) => (
                    <span 
                      key={lineIdx} 
                      style={{
                        fontSize: step.nameLines.length > 1 ? '10px' : '11px',
                        fontWeight: 'bold',
                        maxWidth: '44px',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        wordBreak: 'break-all'
                      }}
                    >
                      {lineText}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
        <button
          disabled={activeStep === 0}
          onClick={() => handleStepClick(activeStep - 1)}
          style={{
            border: 'none',
            backgroundColor: activeStep === 0 ? '#f1f5f9' : '#e0f2fe',
            color: activeStep === 0 ? '#94a3b8' : '#0369a1',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: activeStep === 0 ? 'default' : 'pointer'
          }}
        >
          ◀ 이전
        </button>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
          {activeStep + 1} / {steps.length}
        </span>

        <button
          disabled={activeStep === steps.length - 1}
          onClick={() => handleStepClick(activeStep + 1)}
          style={{
            border: 'none',
            backgroundColor: activeStep === steps.length - 1 ? '#f1f5f9' : '#e0f2fe',
            color: activeStep === steps.length - 1 ? '#94a3b8' : '#0369a1',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: activeStep === steps.length - 1 ? 'default' : 'pointer'
          }}
        >
          다음 ▶
        </button>
      </div>

      <div style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid #bae6fd',
        borderRadius: '10px',
        padding: '14px 16px',
        boxShadow: '0 2px 6px rgba(0, 132, 209, 0.04)',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '1fr',
        alignItems: 'start'
      }}>
        {steps.map((step, idx) => {
          const isSelected = activeStep === idx;

          return (
            <div
              key={step.id}
              style={{
                gridArea: '1 / 1',
                visibility: isSelected ? 'visible' : 'hidden',
                opacity: isSelected ? 1 : 0,
                pointerEvents: isSelected ? 'auto' : 'none',
                transition: 'opacity 0.15s ease-in-out',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 7px',
                  borderRadius: '12px'
                }}>
                  {step.badge}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>
                  {step.title}
                </span>
              </div>

              <div style={{ minHeight: '40px' }}>
                {renderFormattedNotes(step.body, highlightWord)}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

// ----------------------------------------------------
// 📁 [컴포넌트] 탐색기 트리형(|_ 연결) 그린 테마 리스트 뷰
// ----------------------------------------------------
function AllItemListView({ studyList, onSelectRecipe }) {
  const [activeCategory, setActiveCategory] = useState('반죽법');

  const [showNotes, setShowNotes] = useState(false); // ✨ 주의사항 표시 토글 상태 (기본: 숨김)

  const formatTemp = (text) => {
    if (!text || text.trim() === '-' || text.trim() === '') return '';
    const match = text.match(/\d+/);
    return match ? `${match[0]}℃` : text.trim();
  };

  const formatOven = (text) => {
    if (!text || text.trim() === '-' || text.trim() === '') return '-';
    const clean = text.replace(/℃/g, '').replace(/\s+/g, '');
    return `${clean}℃`;
  };

  const formatTime = (text) => {
    if (!text || text.trim() === '-' || text.trim() === '') return '-';
    const clean = text.replace(/분/g, '').replace(/\s+/g, '');
    return `${clean}분`;
  };

  const formatGravity = (text) => {
    if (!text || text.trim() === '-' || text.trim() === '') return '-';
    const clean = text.replace(/\s+/g, '');
    // ± 기호가 없는데 숫자(예: 0.45, .55 등)만 입력된 경우 ±0.05 자동 부착
    if (!clean.includes('±') && /^[\d.]+$/.test(clean)) {
      return `${clean}±0.05`;
    }
    return clean;
  };

  const renderItemTitle = (title) => {
    const match = title.match(/^(.*?)\s*(\(.*?\))$/);
    if (match) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.25' }}>
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{match[1].trim()}</span>
          <span style={{ fontSize: '11px', color: '#047857', fontWeight: 'normal' }}>{match[2]}</span>
        </div>
      );
    }
    return <span style={{ fontWeight: 'bold', fontSize: '13px', lineHeight: '1.25' }}>{title}</span>;
  };

  const getMixingType = (item) => {
    if (item.mixingType !== undefined && item.mixingType !== null) {
      const val = String(item.mixingType).trim();
      if (val === '수작업') return '수작업';
      if (val === '기계사용') return '기계사용';
      return '그외';
    }
    const note = item?.spec?.note || '';
    if (note.includes('수작업') || note.includes('기계X')) return '수작업';
    return '기계사용';
  };

  const getWarmedType = (item) => {
    if (item.isWarmed !== undefined && item.isWarmed !== null) {
      const val = String(item.isWarmed).trim();
      if (val === '1' || val === 'true') return '가온';
      if (val === '0' || val === 'false') return '비가온';
      return '그외';
    }
    const textAll = `${item?.spec?.note || ''} ${item?.summary || ''} ${item?.detail || ''}`;
    if (textAll.includes('중탕') || textAll.includes('가온') || (item?.spec?.mixingMethod || '').includes('공립법')) {
      return '가온';
    }
    return '비가온';
  };

  const getSacrificeType = (item) => {
    if (item.isSacrifice !== undefined && item.isSacrifice !== null) {
      const val = String(item.isSacrifice).trim();
      if (val === '1' || val === 'true') return '사용함';
      if (val === '0' || val === 'false') return '사용안함';
      return '그외';
    }
    const textAll = `${item?.spec?.note || ''} ${item?.summary || ''} ${item?.detail || ''}`;
    if (textAll.includes('희생반죽') || textAll.includes('희생')) {
      return '사용함';
    }
    return '사용안함';
  };

  const methodGroups = useMemo(() => {
    const groups = {};
    studyList.forEach(item => {
      const method = item?.spec?.mixingMethod?.trim() || '미분류';
      if (!groups[method]) {
        groups[method] = [];
      }
      groups[method].push(item);
    });
    return groups;
  }, [studyList]);

  const renderTreeFolderSection = (title, count, items, isPrimary = true) => {
    const headerBg = isPrimary ? '#f0fdf4' : '#fafafa';
    const borderCol = isPrimary ? '#bbf7d0' : '#e5e7eb';
    const folderTitleColor = isPrimary ? '#0f766e' : '#4b5563';
    const badgeBg = isPrimary ? '#0f766e' : '#9ca3af';

    return (
      <div 
        key={title}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: `1.5px solid ${borderCol}`,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(15, 118, 110, 0.04)',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div style={{
          backgroundColor: headerBg,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${borderCol}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13.5px', color: folderTitleColor }}>
            <span style={{ fontSize: '15px' }}>{isPrimary ? '📂' : '📁'}</span>
            <span>{title}</span>
          </div>
          <span style={{
            fontSize: '11px',
            backgroundColor: badgeBg,
            color: '#fff',
            borderRadius: '10px',
            padding: '1px 7px',
            fontWeight: 'bold'
          }}>
            {count}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {items.length === 0 ? (
            <div style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '12px' }}>
              해당 항목이 없습니다.
            </div>
          ) : (
            items.map((item, idx) => {
              const tempFormatted = formatTemp(item.spec?.doughTemp);
              const gravity = formatGravity(item.spec?.specificGravity);
              const oven = formatOven(item.spec?.ovenTemp);
              const time = formatTime(item.spec?.bakingTime);
              const method = item.spec?.mixingMethod || '-';

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderBottom: idx === items.length - 1 ? 'none' : '1px solid #f0fdf4',
                    backgroundColor: '#ffffff',
                    width: '100%',
                    boxSizing: 'border-box',
                    gap: '4px'
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '24px',
                    borderLeft: '2px solid #86efac',
                    borderBottom: '2px solid #86efac',
                    marginBottom: '10px',
                    marginRight: '4px',
                    flexShrink: 0
                  }} />

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flex: 1,
                    minWidth: 0,
                    gap: '6px'
                  }}>
                    <div style={{ flex: '0 0 32%', minWidth: '82px', overflow: 'hidden' }}>
                      <button
                        onClick={() => onSelectRecipe(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0f766e',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left',
                          textDecoration: 'underline'
                        }}
                        title="공부노트로 이동"
                      >
                        {renderItemTitle(item.title)}
                      </button>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      flex: '1 1 68%',
                      minWidth: '185px',
                      backgroundColor: '#f8fafc',
                      padding: '6px 10px',
                      borderRadius: '7px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: '3px' }}>
                        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <span style={{ color: '#0369a1', fontSize: '10.5px' }}>반죽:</span>
                          <span style={{ color: '#0369a1', fontWeight: 'bold' }}>
                            {method}
                            {tempFormatted && <span style={{ color: '#1e293b', fontWeight: 'bold', marginLeft: '2px' }}>({tempFormatted})</span>}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>비중:</span>
                          <span style={{ color: gravity !== '-' ? '#6d28d9' : '#9ca3af', fontWeight: gravity !== '-' ? 'bold' : 'normal' }}>
                            {gravity}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1px' }}>
                        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>오븐:</span>
                          <span style={{ color: '#1e293b', fontWeight: '600' }}>{oven}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', fontSize: '10.5px' }}>시간:</span>
                          <span style={{ color: '#1e293b', fontWeight: '600' }}>{time}</span>
                        </div>
                      </div>
                    {showNotes && item.spec?.note && item.spec.note.trim() !== '' && (
                        <div style={{ 
                          borderTop: '1px dashed #fde68a', 
                          paddingTop: '5px', 
                          marginTop: '3px' 
                        }}>
                          <span style={{ 
                            color: '#92400e', 
                            fontSize: '11px', 
                            lineHeight: '1.4', 
                            wordBreak: 'break-all',
                            display: 'block'
                          }}>
                            {item.spec.note}
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{
        display: 'flex',
        gap: '6px',
        width: '100%',
        justifyContent: 'space-between',
        paddingBottom: '2px',
        boxSizing: 'border-box'
      }}>
        {[
          { key: '반죽법', label: '반죽법' },
          { key: '수작업', label: '수작업' },
          { key: '가온법', label: '가온법' },
          { key: '희생반죽', label: '희생반죽' }
        ].map((tab) => {
          const isSelected = activeCategory === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              style={{
                flex: 1,
                border: isSelected ? '1.5px solid #0f766e' : '1px solid #bbf7d0',
                backgroundColor: isSelected ? '#0f766e' : '#ffffff',
                color: isSelected ? '#ffffff' : '#334155',
                borderRadius: '8px',
                padding: '7px 4px',
                fontSize: '12.5px',
                fontWeight: isSelected ? 'bold' : '500',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: isSelected ? '0 2px 6px rgba(15, 118, 110, 0.25)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '6px' 
      }}>
        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>💡</span>
          <span>품목명을 누르면 공부노트로 이동</span>
        </div>
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          style={{
            backgroundColor: showNotes ? '#fef3c7' : '#ffffff',
            color: showNotes ? '#92400e' : '#64748b',
            border: showNotes ? '1px solid #facc15' : '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '11.5px',
            fontWeight: showNotes ? 'bold' : 'normal',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s ease'
          }}
        >
          {showNotes ? '⚡ 주의사항 숨김' : '⚡ 주의사항 보기'}
        </button>
      </div>

      {activeCategory === '반죽법' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(methodGroups).map(([methodName, items]) => (
            renderTreeFolderSection(
              methodName,
              items.length,
              items,
              true
            )
          ))}
        </div>
      )}

      {activeCategory === '수작업' && (() => {
        const manualItems = studyList.filter(item => getMixingType(item) === '수작업');
        const machineItems = studyList.filter(item => getMixingType(item) === '기계사용');
        const otherItems = studyList.filter(item => getMixingType(item) === '그외');

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {renderTreeFolderSection('수작업', manualItems.length, manualItems, true)}
            {renderTreeFolderSection('기계사용', machineItems.length, machineItems, false)}
            {otherItems.length > 0 && renderTreeFolderSection('그외', otherItems.length, otherItems, false)}
          </div>
        );
      })()}

      {activeCategory === '가온법' && (() => {
        const warmedItems = studyList.filter(item => getWarmedType(item) === '가온');
        const unWarmedItems = studyList.filter(item => getWarmedType(item) === '비가온');
        const otherItems = studyList.filter(item => getWarmedType(item) === '그외');

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {renderTreeFolderSection('가온', warmedItems.length, warmedItems, true)}
            {renderTreeFolderSection('비가온', unWarmedItems.length, unWarmedItems, false)}
            {otherItems.length > 0 && renderTreeFolderSection('그외', otherItems.length, otherItems, false)}
          </div>
        );
      })()}

      {activeCategory === '희생반죽' && (() => {
        const sacrificeItems = studyList.filter(item => getSacrificeType(item) === '사용함');
        const noSacrificeItems = studyList.filter(item => getSacrificeType(item) === '사용안함');
        const otherItems = studyList.filter(item => getSacrificeType(item) === '그외');

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {renderTreeFolderSection('희생반죽 사용함', sacrificeItems.length, sacrificeItems, true)}
            {renderTreeFolderSection('희생반죽 사용안함', noSacrificeItems.length, noSacrificeItems, false)}
            {otherItems.length > 0 && renderTreeFolderSection('그외', otherItems.length, otherItems, false)}
          </div>
        );
      })()}
    </div>
  );
}

// ----------------------------------------------------
// 🏠 메인 App 컴포넌트
// ----------------------------------------------------
function App() {
  // ✨ 1. DB 연동 데이터 상태 (초기값: fallbackStudyList)
  const [studyList, setStudyList] = useState(fallbackStudyList);

  // 모드: 'study' (공부노트), 'test' (테스트), 'list' (전체 리스트), 'game' (게임)
  const [mode, setMode] = useState('study');
  const [hiddenState, setHiddenState] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [targetStepIndex, setTargetStepIndex] = useState(0); // ✨ 도구 클릭 시 이동할 공정 단계
  const [highlightWord, setHighlightWord] = useState(''); // ✨ 검색/클릭된 도구 단어 깜빡임 강조 상태
  const [hasVideoAccess, setHasVideoAccess] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const SECRET_ACCESS_KEY = 'cookie2026';
  const ADMIN_KEY = 'hoyang';

  // ✨ 2. 관리자 모달 제어 상태
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editTargetRecipe, setEditTargetRecipe] = useState(null);

  // 📡 DB에서 전체 품목 불러오기
  const fetchRecipesFromDB = async () => {
    try {
      const res = await fetch('/api/recipes');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // 배운 순서(id 오름차순)대로 정렬
          const sortedData = [...data].sort((a, b) => Number(a.id) - Number(b.id));
          setStudyList(data);
        }
      }
    } catch (err) {
      console.warn('DB 연결 실패, fallback 데이터 유지:', err);
    }
  };

  useEffect(() => {
    fetchRecipesFromDB(); // 앱 로딩 시 DB에서 데이터 패치
  }, []);

  // 🔑 관리자 권한 확인 후 모달 오픈 (hasAdminAccess 상태 활용)
  const handleOpenAdminModal = (target = null) => {
    if (hasAdminAccess) {
      setEditTargetRecipe(target);
      setIsAdminModalOpen(true);
    }
  };

  // ⚙️ 제목 옆 톱니바퀴를 눌러 admin=hoyang 인증 토글 함수
  const handleAdminToggle = () => {
    if (hasAdminAccess) {
      if (window.confirm('관리자 모드를 종료하시겠습니까?')) {
        localStorage.removeItem('hasAdminAccess');
        setHasAdminAccess(false);
        alert('관리자 모드가 해제되었습니다.');
      }
      return;
    }

    const inputPw = window.prompt('관리자 비밀번호를 입력하세요:');
    if (inputPw === ADMIN_KEY) {
      localStorage.setItem('hasAdminAccess', 'true');
      setHasAdminAccess(true);
      alert('관리자 인증이 완료되었습니다! 등록 및 수정 버튼이 활성화됩니다.');
    } else if (inputPw !== null) {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  useEffect(() => {
    // 1. URL 쿼리 파라미터 확인 (search 및 href 전체에서 안전 추출)
    const searchStr = window.location.search || (window.location.href.includes('?') ? '?' + window.location.href.split('?')[1] : '');
    const params = new URLSearchParams(searchStr);
    const accessKey = params.get('access');
    const adminKey = params.get('admin');

    let updated = false;

    // 영상 열람 권한 판별
    if (accessKey === SECRET_ACCESS_KEY) {
      localStorage.setItem('hasVideoAccess', 'true');
      setHasVideoAccess(true);
      updated = true;
    } else if (localStorage.getItem('hasVideoAccess') === 'true') {
      setHasVideoAccess(true);
    }

    // 관리자 수정/등록 권한 판별
    if (adminKey === ADMIN_KEY) {
      localStorage.setItem('hasAdminAccess', 'true');
      setHasAdminAccess(true);
      updated = true;
    } else if (localStorage.getItem('hasAdminAccess') === 'true') {
      setHasAdminAccess(true);
    }

    // 주소창에서 파라미터 흔적 깔끔하게 정리
    if (updated) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const currentItem = studyList[currentIndex] || studyList[0];

  // 도구가 가장 먼저 등장하는 공정(단계 index) 검색 헬퍼
  const findFirstStepIndexByTool = (recipe, toolName) => {
    if (!recipe || !toolName) return 0;
    const content = recipe.summary || recipe.keyPoint || '';
    let text = Array.isArray(content)
      ? content.map(item => (typeof item === 'string' ? item : item.text)).join('\n')
      : String(content);

    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');
    const rawBlocks = text.split(/(?=###\s+|(?<=\n)\[\d+(?:단계)?\])/g).filter(b => b.trim());

    for (let idx = 0; idx < rawBlocks.length; idx++) {
      if (rawBlocks[idx].includes(toolName)) {
        return idx;
      }
    }
    return 0;
  };

  const handleSelectRecipeFromList = (targetId) => {
    const targetIdx = studyList.findIndex(item => item.id === targetId);
    if (targetIdx !== -1) {
      setCurrentIndex(targetIdx);
    }
    setTargetStepIndex(0);
    setHiddenState({});
    setMode('study');
  };

  // ✨ 도구를 클릭했을 때 해당 품목과 해당 단계로 직행하며 단어를 반짝이게 하는 핸들러
  const handleSelectRecipeWithTool = (targetId, toolName) => {
    const targetIdx = studyList.findIndex(item => item.id === targetId);
    if (targetIdx !== -1) {
      setCurrentIndex(targetIdx);
      const stepIdx = findFirstStepIndexByTool(studyList[targetIdx], toolName);
      setTargetStepIndex(stepIdx);
      setHighlightWord(toolName);
      setTimeout(() => {
        setHighlightWord('');
      }, 3000);
    }
    setHiddenState({});
    setMode('study');
  };

  const changeItem = (newIndex) => {
    setCurrentIndex(newIndex);
    setTargetStepIndex(0);
    setHighlightWord('');
    setHiddenState({});
  };

  const toggleWordHidden = (toggleKey, uniqueWordKey) => {
    setHiddenState(prev => ({
      ...prev,
      [toggleKey]: {
        ...(prev[toggleKey] || {}),
        [uniqueWordKey]: !((prev[toggleKey] || {})[uniqueWordKey])
      }
    }));
  };

  // ---------------- [수정 후] ----------------
  const getEmbedUrl = (url) => {
    if (!url) return '';
    const cleanUrl = String(url).trim();
    // 이미 embed 형태인 경우 그대로 반환
    if (cleanUrl.includes('youtube.com/embed/')) return cleanUrl;

    // watch?v=, youtu.be/, shorts/, embed/ 등 다양한 형태에서 11자리 비디오 ID 추출
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const match = cleanUrl.match(regExp);

    return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : cleanUrl;
  };
  // -------------------------------------------

  const parseSpecificGravity = (text) => {
    if (!text || text.trim() === '-' || text.trim() === '') return null;
    const raw = String(text).trim();

    // 1. 이미 "0.55 ± 0.05" 형식인 경우
    const match = raw.match(/^([\d.]+)\s*[±]\s*([\d.]+)/);
    if (match) {
      const center = parseFloat(match[1]);
      const range = parseFloat(match[2]);
      return {
        coreVal: match[1],
        restText: ` ± ${match[2]} (${(center - range).toFixed(2)} ~ ${(center + range).toFixed(2)})`
      };
    }

    // 2. "0.55" 처럼 기준 숫자만 입력된 경우 -> ± 0.05 및 실제 계산 범위 자동 생성
    const singleNum = parseFloat(raw);
    if (!isNaN(singleNum)) {
      const minVal = (singleNum - 0.05).toFixed(2);
      const maxVal = (singleNum + 0.05).toFixed(2);
      return {
        coreVal: raw,
        restText: ` ± 0.05 (${minVal} ~ ${maxVal})`
      };
    }

    return { coreVal: raw, restText: '' };
  };

  const renderPlainText = (textData) => {
    return typeof textData === 'string' ? textData : textData.text;
  };

  const renderFormattedNotes = (keyPoints, activeHighlight = '') => {
    let text = Array.isArray(keyPoints)
      ? keyPoints.map(kp => renderPlainText(kp)).join('\n')
      : String(keyPoints);

    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');
    const lines = text.split('\n');

    // 검색 단어 강조 래퍼 함수 (반짝반짝 애니메이션)
    const wrapHighlight = (elementOrString, keyPrefix) => {
      if (!activeHighlight || !activeHighlight.trim()) return elementOrString;
      if (typeof elementOrString !== 'string') return elementOrString;
      if (!elementOrString.includes(activeHighlight)) return elementOrString;

      const subParts = elementOrString.split(activeHighlight);
      return subParts.reduce((acc, curr, sIdx) => {
        if (sIdx === 0) return [curr];
        return [
          ...acc,
          <span
            key={`${keyPrefix}-hl-${sIdx}`}
            className="highlight-flash"
            style={{
              backgroundColor: '#fde047',
              color: '#854d0e',
              padding: '1px 4px',
              borderRadius: '4px',
              fontWeight: 'bold',
              boxShadow: '0 0 8px #f59e0b',
              animation: 'blinkGlow 0.8s ease-in-out infinite alternate',
              display: 'inline-block'
            }}
          >
            {activeHighlight}
          </span>,
          curr
        ];
      }, []);
    };

    // 커스텀 마크다운 인라인 파서: **강조**, ~취소~, ::주황색::, ==배경색==, <u>밑줄</u>, _밑줄_
    const formatCustomMarkdown = (content) => {
      const regex = /(\*\*.*?\*\*|~.*?~|::.*?::|==.*?==|<u>.*?<\/u>|_[^_]+_)/g;
      const parts = content.split(regex);

      return parts.filter(Boolean).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const inner = part.slice(2, -2);
          return <strong key={i} style={{ color: '#713f12', fontWeight: 'bold' }}>{wrapHighlight(inner, `b-${i}`)}</strong>;
        }
        if (part.startsWith('~') && part.endsWith('~')) {
          const inner = part.slice(1, -1);
          return <span key={i} style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{wrapHighlight(inner, `d-${i}`)}</span>;
        }
        if (part.startsWith('::') && part.endsWith('::')) {
          const inner = part.slice(2, -2);
          return <span key={i} style={{ color: '#ea580c', fontWeight: 'bold' }}>{wrapHighlight(inner, `o-${i}`)}</span>;
        }
        if (part.startsWith('==') && part.endsWith('==')) {
          const inner = part.slice(2, -2);
          return <mark key={i} style={{ backgroundColor: '#fef08a', color: '#713f12', padding: '1px 3px', borderRadius: '3px' }}>{wrapHighlight(inner, `m-${i}`)}</mark>;
        }
        if (part.startsWith('<u>') && part.endsWith('</u>')) {
          const inner = part.slice(3, -4);
          return <u key={i} style={{ textDecoration: 'underline', textUnderlineOffset: '3px', color: '#0369a1', fontWeight: '600' }}>{wrapHighlight(inner, `u-${i}`)}</u>;
        }
        if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
          const inner = part.slice(1, -1);
          return <u key={i} style={{ textDecoration: 'underline', textUnderlineOffset: '3px', color: '#0369a1', fontWeight: '600' }}>{wrapHighlight(inner, `under-${i}`)}</u>;
        }
        return <React.Fragment key={i}>{wrapHighlight(part, `txt-${i}`)}</React.Fragment>;
      });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
        {lines.map((rawLine, idx) => {
          const line = rawLine.trim();

          if (!line) {
            return <div key={idx} style={{ height: '8px' }} />;
          }

          // 일반 대시(-), 언더바(_), 특수 대시(—, –)가 공백 포함 2개 이상 조합되어 줄 전체를 이룰 때 구분선 처리
          if (/^[\s\-_—–~*]{2,}$/.test(line) && /[\-_—–]/.test(line)) {
            return (
              <div 
                key={idx} 
                style={{ 
                  borderBottom: '1px solid #fef08a', 
                  margin: '10px 0' 
                }} 
              />
            );
          }

          if (/^###\s+/.test(line) || /^\[.+\]/.test(line)) {
            const cleanTitle = line
              .replace(/^###\s+/, '')
              .replace(/\(.*?\)/g, '')
              .trim();

            return (
              <div 
                key={idx} 
                style={{ 
                  fontSize: '15px', 
                  fontWeight: 'bold', 
                  color: '#713f12', 
                  marginTop: idx === 0 ? '0px' : '14px', 
                  paddingBottom: '5px', 
                  borderBottom: '1.5px dashed #fde047', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px' 
                }}
              >
                <span>📌</span>
                <span>{formatCustomMarkdown(cleanTitle)}</span>
              </div>
            );
          }

          if (/^##\s+/.test(line) || /^■\s*/.test(line)) {
            const cleanSubTitle = line.replace(/^(##|■)\s*/, '');
            return (
              <div 
                key={idx} 
                style={{ 
                  fontSize: '13.5px', 
                  fontWeight: 'bold', 
                  color: '#854d0e', 
                  marginTop: '8px', 
                  marginBottom: '2px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px' 
                }}
              >
                <span>▫️</span>
                <span>{formatCustomMarkdown(cleanSubTitle)}</span>
              </div>
            );
          }

          // 느낌표(!)로 시작하는 연속된 주의사항들을 하나의 박스 안에 묶어 표시
          if (/^!\s*/.test(line)) {
            // 이전 줄도 느낌표였다면 이미 묶음 박스 안에 포함되었으므로 중복 렌더링 방지
            const prevLine = idx > 0 ? lines[idx - 1].trim() : '';
            if (/^!\s*/.test(prevLine)) {
              return null;
            }

            // 현재 줄부터 연속된 모든 느낌표 주의사항 줄 수집
            const cautionLines = [];
            for (let i = idx; i < lines.length; i++) {
              const cur = lines[i].trim();
              if (/^!\s*/.test(cur)) {
                cautionLines.push(cur.replace(/^!\s*/, ''));
              } else {
                break;
              }
            }

            return (
              <div 
                key={idx} 
                style={{ 
                  backgroundColor: '#fffbeb', 
                  border: '1px solid #fde68a', 
                  borderLeft: '4px solid #f59e0b', 
                  padding: '7px 10px', 
                  borderRadius: '6px', 
                  fontSize: '12.5px', 
                  color: '#92400e', 
                  lineHeight: '1.55', 
                  margin: '4px 0',
                  boxShadow: '0 1px 2px rgba(245, 158, 11, 0.05)'
                }}
              >
                {cautionLines.length === 1 ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <span style={{ color: '#d97706', fontWeight: 'bold' }}>•</span>
                    <span>{formatCustomMarkdown(cautionLines[0])}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {cautionLines.map((cLine, cIdx) => (
                      <div key={cIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <span style={{ color: '#d97706', fontWeight: 'bold' }}>•</span>
                        <span>{formatCustomMarkdown(cLine)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (/^(💡|주의:|tip:|\[주의\]|\[팁\])/i.test(line)) {
            return (
              <div 
                key={idx} 
                style={{ 
                  backgroundColor: '#fef08a', 
                  borderLeft: '4px solid #eab308', 
                  padding: '7px 11px', 
                  borderRadius: '4px', 
                  fontSize: '12.5px', 
                  color: '#713f12', 
                  lineHeight: '1.5', 
                  margin: '4px 0' 
                }}
              >
                {formatCustomMarkdown(line)}
              </div>
            );
          }

          if (/^>\s*/.test(line)) {
            const quoteContent = line.replace(/^>\s*/, '');
            return (
              <div 
                key={idx} 
                style={{ 
                  backgroundColor: '#fffdf5', 
                  borderLeft: '3px solid #fde047', 
                  padding: '5px 10px', 
                  borderRadius: '2px', 
                  fontSize: '12.5px', 
                  color: '#78350f', 
                  lineHeight: '1.55', 
                  margin: '2px 0 4px 6px' 
                }}
              >
                {formatCustomMarkdown(quoteContent)}
              </div>
            );
          }

          const isBullet = /^[-*]\s+/.test(line);
          const isNumbered = /^\d+\.\s+/.test(line);

          if (isBullet || isNumbered) {
            // 문장 앞 '- ' 또는 '* '를 점(•) 기호로 변환
            const bulletPrefix = isNumbered ? line.match(/^\d+\./)[0] : '•';
            const cleanContent = line.replace(/^([-*]|\d+\.)\s+/, '');

            return (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '6px', 
                  fontSize: '13px', 
                  lineHeight: '1.6', 
                  color: '#78350f', 
                  paddingLeft: isNumbered ? '2px' : '6px' 
                }}
              >
                <span style={{ color: '#ca8a04', fontWeight: 'bold', flexShrink: 0 }}>
                  {bulletPrefix}
                </span>
                <span style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {formatCustomMarkdown(cleanContent)}
                </span>
              </div>
            );
          }

          return (
            <div 
              key={idx} 
              style={{ 
                fontSize: '13px', 
                lineHeight: '1.65', 
                color: '#78350f', 
                wordBreak: 'break-word', 
                overflowWrap: 'anywhere' 
              }}
            >
              {formatCustomMarkdown(line)}
            </div>
          );
        })}
      </div>
    );
  };

  // 온도 포맷터: "20" -> "20℃"
  const displayTemp = (t) => {
    if (!t || t.trim() === '-' || t.trim() === '') return '-';
    const clean = String(t).replace(/℃/g, '').trim();
    return clean ? `${clean}℃` : '-';
  };

  // 오븐온도 포맷터: "180 / 160" -> "180℃ / 160℃", "180 ~ 160" -> "180℃ ~ 160℃"
  const displayOven = (o) => {
    if (!o || o.trim() === '-' || o.trim() === '') return '레시피 참조';
    let clean = String(o).replace(/℃/g, '').trim();
    if (clean.includes('/')) {
      const [up, down] = clean.split('/').map(v => v.trim());
      return `${up}℃ / ${down}℃`;
    }
    if (clean.includes('~')) {
      const [up, down] = clean.split('~').map(v => v.trim());
      return `${up}℃ ~ ${down}℃`;
    }
    return `${clean}℃`;
  };

  // 굽기시간 포맷터: "25" -> "25분", "25~30" -> "25~30분"
  const displayTime = (b) => {
    if (!b || b.trim() === '-' || b.trim() === '') return '레시피 참조';
    const clean = String(b).replace(/분/g, '').trim();
    return `${clean}분`;
  };

  const gravityData = parseSpecificGravity(currentItem?.spec?.specificGravity);

  return (
    <div style={{ 
      padding: '20px 16px', 
      fontFamily: 'sans-serif', 
      maxWidth: '850px', 
      width: '100%', 
      margin: '0 auto', 
      backgroundColor: '#fcfdfa', 
      minHeight: '100vh', 
      textAlign: 'left', 
      boxSizing: 'border-box' 
    }}>
      
      {/* 1. 상단 헤더 & 4가지 모드 전환 버튼 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px', 
        marginBottom: '16px', 
        borderBottom: '1px solid #e5e7eb', 
        paddingBottom: '14px' 
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h1 style={{ color: '#0f766e', margin: '0 0 4px 0', fontSize: '21px', fontWeight: 'bold' }}>
              <span
                onClick={handleAdminToggle}
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  display: 'inline-block'
                }}
              >
                🥐
              </span>
              {' '}제과기능사 공부노트
              {hasAdminAccess && (
                <button
                  type="button"
                  onClick={fetchRecipesFromDB}
                  style={{
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '2px 4px',
                    verticalAlign: 'middle',
                    lineHeight: 1
                  }}
                  title="DB 새로고침"
                >
                  🔄
                </button>
              )}
            </h1>
          </div>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>
            우리 모두 합격까지 힘내보아요! 🍀
          </p>
        </div>

        {/* 상단 4대 탭 */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>

          {hasAdminAccess && (
            <button 
              onClick={() => handleOpenAdminModal(null)}
              style={{ 
                padding: '7px 10px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                backgroundColor: '#f8fafc', 
                color: '#0f766e', 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                fontSize: '12px' 
              }}
              title="새 제과 품목 등록"
            >
              ⚙ 등록
            </button>
          )}


          <button 
            onClick={() => setMode('study')}
            style={{ 
              padding: '7px 10px', 
              borderRadius: '8px', 
              border: '1px solid ' + (mode === 'study' ? '#86efac' : '#e5e7eb'), 
              backgroundColor: mode === 'study' ? '#f0fdf4' : '#fff', 
              color: mode === 'study' ? '#166534' : '#6b7280', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '12px' 
            }}
          >
            📖 공부
          </button>
          
          <button 
            onClick={() => {
              setMode('test');
              setHiddenState({});
            }}
            style={{ 
              padding: '7px 10px', 
              borderRadius: '8px', 
              border: '1px solid ' + (mode === 'test' ? '#86efac' : '#e5e7eb'), 
              backgroundColor: mode === 'test' ? '#f0fdf4' : '#fff', 
              color: mode === 'test' ? '#166534' : '#6b7280', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '12px' 
            }}
          >
            🎯 테스트
          </button>
                   
         <button 
            onClick={() => setMode('list')}
            style={{ 
              padding: '7px 10px', 
              borderRadius: '8px', 
              border: '1px solid ' + (mode === 'list' ? '#0f766e' : '#e5e7eb'), 
              backgroundColor: mode === 'list' ? '#0f766e' : '#fff', 
              color: mode === 'list' ? '#ffffff' : '#4b5563', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '12px',
              boxShadow: mode === 'list' ? '0 2px 5px rgba(15, 118, 110, 0.25)' : 'none'
            }}
          >
            📋 총정리
          </button>

          <button 
            onClick={() => setMode('game')}
            style={{ 
              padding: '7px 10px', 
              borderRadius: '8px', 
              border: '1px solid ' + (mode === 'game' ? '#f59e0b' : '#e5e7eb'), 
              backgroundColor: mode === 'game' ? '#fef3c7' : '#fff', 
              color: mode === 'game' ? '#b45309' : '#6b7280', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '12px',
              boxShadow: mode === 'game' ? '0 2px 5px rgba(245, 158, 11, 0.25)' : 'none'
            }}
          >
            🎮 게임
          </button>

          <button 
            onClick={() => setMode('equipment')}
            style={{ 
              padding: '7px 10px', 
              borderRadius: '8px', 
              border: '1px solid ' + (mode === 'equipment' ? '#0f766e' : '#e5e7eb'), 
              backgroundColor: mode === 'equipment' ? '#0f766e' : '#fff', 
              color: mode === 'equipment' ? '#ffffff' : '#4b5563', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '12px',
              boxShadow: mode === 'equipment' ? '0 2px 5px rgba(15, 118, 110, 0.25)' : 'none'
            }}
          >
            🧰 준비물
          </button>

          
        </div>
      </div>

      {/* 2. [게임 모드] */}
      {mode === 'game' && (
        <SpecQuizGame studyList={studyList} />
      )}

      {/* 3. [전체 리스트 모드] */}
      {mode === 'list' && (
        <AllItemListView 
          studyList={studyList} 
          onSelectRecipe={handleSelectRecipeFromList}
        />
      )}

      {/* 3-2. [준비물 창 모드] */}
      {mode === 'equipment' && (
        <EquipmentListView 
          studyList={studyList} 
          onSelectRecipe={handleSelectRecipeFromList}
          onSelectRecipeWithTool={handleSelectRecipeWithTool}
        />
      )}

      {/* 4. [공부노트 / 테스트 모드] */}
      {(mode === 'study' || mode === 'test') && currentItem && (() => {
        const item = currentItem;
        const hasNote = Boolean(item?.spec?.note && item.spec.note.trim() !== '');

        const getSpecCardStyle = (isRevealed, cardType = 'default') => {
          let bg = '#f0f9ff';
          let border = '#bae6fd';

          if (!isRevealed) {
            bg = '#fafafa';
            border = '#f3f4f6';
          } else if (cardType === 'note') {
            bg = '#fff7ed';
            border = '#fed7aa';
          } else if (cardType === 'gravity') {
            bg = '#f5f3ff';
            border = '#ddd6fe';
          }

          return {
            backgroundColor: bg,
            border: `1px solid ${border}`,
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            userSelect: 'none',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
            transition: 'all 0.2s'
          };
        };

        const getSpecTextStyle = (isRevealed, cardType = 'default') => {
          let activeColor = '#0369a1';
          if (cardType === 'note') activeColor = '#c2410c';
          if (cardType === 'gravity') activeColor = '#6d28d9';

          return {
            fontSize: '16px',
            color: isRevealed ? activeColor : '#374151',
            textDecoration: 'none',
            fontWeight: 'bold',
            filter: isRevealed ? 'none' : 'blur(5px)',
            opacity: isRevealed ? 1 : 0.3,
            wordBreak: 'break-word',
            overflowWrap: 'anywhere'
          };
        };

        return (
          <div 
            key={item.id} 
            style={{ 
              backgroundColor: '#fff', 
              border: '1px solid #f3f4f6', 
              borderRadius: '16px', 
              padding: '14px', 
              marginBottom: '20px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)', 
              width: '100%', 
              boxSizing: 'border-box' 
            }}
          >
            {/* 네비게이션 헤더 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              backgroundColor: '#f0fdf4', 
              border: '1px solid #bbf7d0', 
              borderRadius: '12px', 
              padding: '5px 6px', 
              marginBottom: '14px' 
            }}>
              <button
                onClick={() => changeItem(currentIndex === 0 ? studyList.length - 1 : currentIndex - 1)}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid #86efac',
                  backgroundColor: '#fff',
                  color: '#0f766e',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="이전 품목"
              >
                ◀
              </button>

              <div style={{ flex: 1, minWidth: 0, padding: '0 4px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <select
                  value={currentIndex}
                  onChange={(e) => changeItem(Number(e.target.value))}
                  style={{
                    flex: 1,
                    maxWidth: '85%',
                    padding: '6px 4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0f766e',
                    fontSize: '15px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textAlignLast: 'center',
                    appearance: 'auto',
                    outline: 'none'
                  }}
                >
                  {studyList.map((listItem, idx) => (
                    <option key={listItem.id || idx} value={idx}>
                      {listItem.title}
                    </option>
                  ))}
                </select>

                {hasAdminAccess && (
                  <button
                    onClick={() => handleOpenAdminModal(currentItem)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#0f766e',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '0 4px',
                      flexShrink: 0
                    }}
                    title="현재 품목 스펙 및 설명 수정"
                  >
                    수정
                  </button>
                )}
              </div>

              <button
                onClick={() => changeItem(currentIndex === studyList.length - 1 ? 0 : currentIndex + 1)}
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid #86efac',
                  backgroundColor: '#fff',
                  color: '#0f766e',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="다음 품목"
              >
                ▶
              </button>
            </div>

            {/* 공부 모드 상단 스펙 */}
            {mode === 'study' && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
                gap: '10px', 
                marginBottom: '15px', 
                width: '100%', 
                boxSizing: 'border-box' 
              }}>
                {/* 1. 반죽 방법 (복구 완료) */}
                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 방법</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {item.spec.mixingMethod || '-'}
                  </div>
                </div>

                {/* 2. 반죽 온도 (숫자만 있어도 ℃ 자동 부착 + 핸드폰용 초소형 시험시간 배지) */}
                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 온도</span>
                    {item.category && (
                      <span
                        style={{
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          border: '1px solid #86efac',
                          borderRadius: '4px',
                          padding: '0 4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          lineHeight: '1.4',
                          whiteSpace: 'nowrap'
                        }}
                        title={`시험시간: ${item.category}`}
                      >
                        ⏱️{item.category}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {displayTemp(item.spec.doughTemp)}
                  </div>
                </div>

                {/* 3. 비중 (0.55만 있어도 ±0.05 및 계산식 자동 생성, '-'인 품목은 안 보임) */}
                {gravityData && (
                  <div style={{ gridColumn: 'span 2', backgroundColor: '#f5f3ff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd6fe', minWidth: 0, boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '12px', color: '#6d28d9', fontWeight: 'bold' }}>⚖️ 비중 (기준)</div>
                    <div style={{ fontSize: '16px', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <span style={{ color: '#5b21b6', fontWeight: 'bold', fontSize: '18px' }}>
                        {gravityData.coreVal}
                      </span>
                      {gravityData.restText && (
                        <span style={{ color: '#6b7280', fontWeight: 'normal', fontSize: '14px' }}>
                          {gravityData.restText}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. 오븐 온도 (190 / 130 입력 시 190℃ / 130℃ 자동 부착) */}
                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>오븐 온도</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {displayOven(item.spec.ovenTemp)}
                  </div>
                </div>

                {/* 5. 굽기 시간 (10 ~ 12 또는 25 입력 시 '분' 자동 부착) */}
                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>굽기 시간</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {displayTime(item.spec.bakingTime)}
                  </div>
                </div>

                {/* 6. 주의사항 */}
                {hasNote && (
                  <div style={{ gridColumn: 'span 2', backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7', minWidth: 0, boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 'bold' }}>⚡ 주의사항</div>
                    <div style={{ fontSize: '15px', color: '#92400e', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {item.spec.note}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 테스트 모드 상단 스펙 */}
            {mode === 'test' && (() => {
              const mixRevealed = !!(hiddenState[`spec_${item.id}_mixing`]?.['0_0']);
              const tempRevealed = !!(hiddenState[`spec_${item.id}_temp`]?.['0_0']);
              const gravityRevealed = !!(hiddenState[`spec_${item.id}_gravity`]?.['0_0']);
              const ovenRevealed = !!(hiddenState[`spec_${item.id}_oven`]?.['0_0']);
              const bakingRevealed = !!(hiddenState[`spec_${item.id}_baking`]?.['0_0']);
              const noteRevealed = !!(hiddenState[`spec_${item.id}_note`]?.['0_0']);

              return (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', 
                  gap: '10px', 
                  width: '100%', 
                  boxSizing: 'border-box' 
                }}>
                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_mixing`, '0_0')}
                    style={getSpecCardStyle(mixRevealed, 'default')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 방법</span>
                      <span style={{ fontSize: '12px' }}>{mixRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(mixRevealed, 'default')}>
                      {item.spec.mixingMethod}
                    </div>
                  </div>

                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_temp`, '0_0')}
                    style={getSpecCardStyle(tempRevealed, 'default')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 온도</span>
                      <span style={{ fontSize: '12px' }}>{tempRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(tempRevealed, 'default')}>
                      {item.spec.doughTemp}
                    </div>
                  </div>

                  {gravityData && (
                    <div 
                      onClick={() => toggleWordHidden(`spec_${item.id}_gravity`, '0_0')}
                      style={{ gridColumn: 'span 2', ...getSpecCardStyle(gravityRevealed, 'gravity') }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: gravityRevealed ? '#6d28d9' : '#6b7280', fontWeight: 'bold' }}>⚖️ 비중 (기준)</span>
                        <span style={{ fontSize: '12px' }}>{gravityRevealed ? '👁️' : '🔒'}</span>
                      </div>
                      <div style={getSpecTextStyle(gravityRevealed, 'gravity')}>
                        <span style={{ color: gravityRevealed ? '#5b21b6' : 'inherit', fontWeight: 'bold', fontSize: '18px' }}>
                          {gravityData.coreVal}
                        </span>
                        {gravityData.restText && (
                          <span style={{ color: gravityRevealed ? '#6b7280' : 'inherit', fontWeight: 'normal', fontSize: '14px' }}>
                            {gravityData.restText}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_oven`, '0_0')}
                    style={getSpecCardStyle(ovenRevealed, 'default')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>오븐 온도</span>
                      <span style={{ fontSize: '12px' }}>{ovenRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(ovenRevealed, 'default')}>
                      {item.spec.ovenTemp || '레시피 참조'}
                    </div>
                  </div>

                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_baking`, '0_0')}
                    style={getSpecCardStyle(bakingRevealed, 'default')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>굽기 시간</span>
                      <span style={{ fontSize: '12px' }}>{bakingRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(bakingRevealed, 'default')}>
                      {item.spec.bakingTime || '레시피 참조'}
                    </div>
                  </div>

                  {hasNote && (
                    <div 
                      onClick={() => toggleWordHidden(`spec_${item.id}_note`, '0_0')}
                      style={{ gridColumn: 'span 2', ...getSpecCardStyle(noteRevealed, 'note') }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 'bold' }}>⚡ 주의사항</span>
                        <span style={{ fontSize: '12px' }}>{noteRevealed ? '👁️' : '🔒'}</span>
                      </div>
                      <div style={getSpecTextStyle(noteRevealed, 'note')}>
                        {item.spec.note}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 공정 순서 및 상세과정설명 */}
            {(() => {
              const summaryContent = item.summary || item.keyPoint;
              const hasSummary = Array.isArray(summaryContent) ? summaryContent.length > 0 : Boolean(summaryContent);

              const detailContent = item.detail;
              const hasDetail = Boolean(detailContent && String(detailContent).trim() !== '');

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '24px' }}>
                  {hasSummary && (
                    <div>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: '#0284c7', 
                        marginBottom: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                      }}>
                        <span>🧭</span>
                        <span>
                          {mode === 'test' ? '공정 순서 맞추기 (뽑기통)' : '공정 순서 (터치하세요)'}
                        </span>
                      </div>

                      <div style={{ 
                        backgroundColor: '#f0f9ff', 
                        border: '1px solid #bae6fd', 
                        borderRadius: '12px', 
                        padding: '14px 12px', 
                        color: '#0369a1', 
                        width: '100%', 
                        boxSizing: 'border-box' 
                      }}>
                        {/* 반짝임 애니메이션 키프레임 */}
                        <style>{`
                          @keyframes blinkGlow {
                            0% { transform: scale(1); box-shadow: 0 0 4px #f59e0b; }
                            100% { transform: scale(1.08); box-shadow: 0 0 14px #eab308, 0 0 6px #f59e0b; }
                          }
                        `}</style>
                        <StepFlowView 
                          contentData={summaryContent} 
                          renderFormattedNotes={renderFormattedNotes} 
                          mode={mode}
                          itemId={item.id}
                          onOpenEquipmentView={() => setMode('equipment')}
                          initialStep={targetStepIndex}
                          highlightWord={highlightWord}
                        />
                      </div>
                    </div>
                  )}

                  {/* ✨ 공정 순서 아래로 따로 분리된 슬림 준비 도구 목록 */}
                  {(() => {
                    const allText = `${item.summary || ''} ${item.keyPoint ? (Array.isArray(item.keyPoint) ? item.keyPoint.join(' ') : item.keyPoint) : ''} ${item.detail || ''}`;
                    const tools = [];
                    const uRegex = /<u>(.*?)<\/u>/gi;
                    let match;
                    while ((match = uRegex.exec(allText)) !== null) {
                      if (match[1]?.trim()) tools.push(match[1].trim());
                    }
                    const underRegex = /_([^_]+)_/g;
                    while ((match = underRegex.exec(allText)) !== null) {
                      if (match[1]?.trim()) tools.push(match[1].trim());
                    }
                    const itemTools = Array.from(new Set(tools));

                    if (itemTools.length === 0) return null;

                    return (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '0 2px',
                        boxSizing: 'border-box'
                      }}>
                        {itemTools.map((tool, tIdx) => (
                          <span
                            key={tIdx}
                            onClick={() => {
                              const stepIdx = findFirstStepIndexByTool(item, tool);
                              setTargetStepIndex(stepIdx);
                              setHighlightWord(tool);
                              setTimeout(() => setHighlightWord(''), 3000);
                            }}
                            style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #7dd3fc',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: '600',
                              lineHeight: '1.2',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                            title={`클릭 시 [${tool}]이(가) 처음 나오는 공정으로 이동`}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {mode === 'study' && hasDetail && (
                    <div>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: '#44403c', 
                        marginBottom: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                      }}>
                        <span>📋</span>
                        <span>상세과정설명</span>
                      </div>

                      <div style={{ 
                        backgroundColor: '#fafaf9', 
                        border: '1px solid #e7e5e4', 
                        borderRadius: '10px', 
                        padding: '14px 16px', 
                        color: '#44403c', 
                        width: '100%', 
                        boxSizing: 'border-box' 
                      }}>
                        {renderFormattedNotes(detailContent)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ✨ 공부 모드 동영상: 상세과정설명(상세노트) 아래로 배치 */}
            {mode === 'study' && (
              <>
                {hasVideoAccess && item.videos && item.videos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px', marginBottom: '12px', width: '100%', boxSizing: 'border-box' }}>
                    {item.videos.map((v, vIdx) => {
                      const videoUrl = typeof v === 'string' ? v : v.url;
                      const videoTitle = typeof v === 'string' ? `참고 영상 ${vIdx + 1}` : (v.title || `참고 영상 ${vIdx + 1}`);

                      return (
                        <div 
                          key={vIdx} 
                          style={{ 
                            backgroundColor: '#fdfbf7', 
                            border: '1px solid #f1ece4', 
                            borderRadius: '12px', 
                            padding: '12px 14px', 
                            boxSizing: 'border-box' 
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px' }}>🎬</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#44403c', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              {videoTitle}
                            </span>
                          </div>

                          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                            <iframe 
                              src={getEmbedUrl(videoUrl)} 
                              title={videoTitle}
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div style={{ 
                      fontSize: '11.5px', 
                      color: '#9ca3af', 
                      textAlign: 'center', 
                      marginTop: '-4px', 
                      lineHeight: '1.4', 
                      wordBreak: 'break-word', 
                      overflowWrap: 'anywhere', 
                      padding: '0 8px' 
                    }}>
                      ※ 본 실습 영상은 학습자 전용 일부공개 영상이므로, 외부 링크 유출 없이 이곳에서만 시청해 주시기 바랍니다.
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        );
      })()}
      {/* ✨ 새로 추가: 관리자 등록/수정 모달 컴포넌트 */}
      <AdminRecipeModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        targetRecipe={editTargetRecipe}
        onSaved={fetchRecipesFromDB}
        secretKey={SECRET_ACCESS_KEY}
      />
    </div>
  );
}

export default App;