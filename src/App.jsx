import React, { useState, useEffect, useMemo, useRef } from 'react';
import studyList from './studyData.js'; // ✨ .js 파일 import

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
// 🧭 [컴포넌트] 공정플로우 뷰
// ----------------------------------------------------
function StepFlowView({ contentData, renderFormattedNotes, mode, itemId }) {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef([]);

  const steps = useMemo(() => {
    if (!contentData) return [];

    let text = Array.isArray(contentData)
      ? contentData.map(item => (typeof item === 'string' ? item : item.text)).join('\n')
      : String(contentData);

    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');

    const rawBlocks = text.split(/(?=###\s+|(?<=\n)\[\d+단계\])/g).filter(b => b.trim());

    if (rawBlocks.length === 0) return [];

    return rawBlocks.map((block, idx) => {
      const lines = block.trim().split('\n');
      const firstLine = lines[0].replace(/^###\s+/, '').trim();

      const match = firstLine.match(/\[(.*?)\]\s*(.*)/);
      const badge = match ? match[1] : `${idx + 1}단계`;
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

  useEffect(() => {
    setActiveStep(0);
  }, [contentData, mode, itemId]);

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
                {renderFormattedNotes(step.body)}
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
    return text.replace(/\s+/g, '');
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

      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>💡</span>
        <span>품목명을 누르면 공부노트로 이동합니다.</span>
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
  // 모드: 'study' (공부노트), 'test' (테스트), 'list' (전체 리스트), 'game' (게임)
  const [mode, setMode] = useState('study');
  const [hiddenState, setHiddenState] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [hasVideoAccess, setHasVideoAccess] = useState(false);
  const SECRET_ACCESS_KEY = 'cookie2026';

  useEffect(() => {
    const isVip = localStorage.getItem('hasVideoAccess') === 'true';
    if (isVip) {
      setHasVideoAccess(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const accessKey = params.get('access');

    if (accessKey === SECRET_ACCESS_KEY) {
      localStorage.setItem('hasVideoAccess', 'true');
      setHasVideoAccess(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const currentItem = studyList[currentIndex] || studyList[0];

  const handleSelectRecipeFromList = (targetId) => {
    const targetIdx = studyList.findIndex(item => item.id === targetId);
    if (targetIdx !== -1) {
      setCurrentIndex(targetIdx);
    }
    setHiddenState({});
    setMode('study');
  };

  const changeItem = (newIndex) => {
    setCurrentIndex(newIndex);
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

  const getEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const parseSpecificGravity = (text) => {
    if (!text || text.trim() === '-' || text.trim() === '') return null;
    const match = text.match(/^([\d.]+)\s*[±]\s*([\d.]+)/);
    if (match) {
      const center = parseFloat(match[1]);
      const range = parseFloat(match[2]);
      const minVal = (center - range).toFixed(2);
      const maxVal = (center + range).toFixed(2);
      return {
        coreVal: match[1],
        restText: ` ± ${match[2]} (${minVal} ~ ${maxVal})`
      };
    }
    return {
      coreVal: text,
      restText: ''
    };
  };

  const renderPlainText = (textData) => {
    return typeof textData === 'string' ? textData : textData.text;
  };

  const renderFormattedNotes = (keyPoints) => {
    let text = Array.isArray(keyPoints)
      ? keyPoints.map(kp => renderPlainText(kp)).join('\n')
      : String(keyPoints);

    text = text.replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');
    const lines = text.split('\n');

    const formatInlineBold = (content) => {
      const parts = content.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} style={{ color: '#713f12', fontWeight: 'bold' }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
        {lines.map((rawLine, idx) => {
          const line = rawLine.trim();

          if (!line) {
            return <div key={idx} style={{ height: '8px' }} />;
          }

          if (/^---+$/.test(line)) {
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
                <span>{formatInlineBold(cleanTitle)}</span>
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
                <span>{formatInlineBold(cleanSubTitle)}</span>
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
                {formatInlineBold(line)}
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
                {formatInlineBold(quoteContent)}
              </div>
            );
          }

          const isBullet = /^[-*]\s+/.test(line);
          const isNumbered = /^\d+\.\s+/.test(line);

          if (isBullet || isNumbered) {
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
                  {formatInlineBold(cleanContent)}
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
              {formatInlineBold(line)}
            </div>
          );
        })}
      </div>
    );
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
      
      {/* 1. 상단 헤더 & 4가지 모드 전환 버튼 ('테스트'로 변경) */}
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
          <h1 style={{ color: '#0f766e', margin: '0 0 4px 0', fontSize: '21px', fontWeight: 'bold' }}>🥐 제과기능사 공부노트</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>
            우리 모두 합격까지 힘내보아요! 🍀
          </p>
        </div>

        {/* 상단 4대 탭 */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
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
            📖 공부노트
          </button>
          
          {/* ✨ '테스트노트' -> '테스트' 로 변경된 버튼 */}
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
            📋 전체 리스트
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

              <div style={{ flex: 1, minWidth: 0, padding: '0 4px', textAlign: 'center' }}>
                <select
                  value={currentIndex}
                  onChange={(e) => changeItem(Number(e.target.value))}
                  style={{
                    width: '100%',
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
                  {/* ✨ 반죽법 표기를 빼고 품목명만 나오도록 수정 */}
                  {studyList.map((listItem, idx) => (
                    <option key={listItem.id || idx} value={idx}>
                      {listItem.title}
                    </option>
                  ))}
                </select>
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
                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 방법</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {item.spec.mixingMethod}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 온도</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {item.spec.doughTemp}
                  </div>
                </div>

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

                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>오븐 온도</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {item.spec.ovenTemp || '레시피 참조'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0, boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>굽기 시간</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {item.spec.bakingTime || '레시피 참조'}
                  </div>
                </div>

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

            {/* 공부 모드 동영상 */}
            {mode === 'study' && (
              <>
                {hasVideoAccess && item.videos && item.videos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
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

            {/* 공정플로우 및 상세과정설명 */}
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
                        <StepFlowView 
                          contentData={summaryContent} 
                          renderFormattedNotes={renderFormattedNotes} 
                          mode={mode}
                          itemId={item.id}
                        />
                      </div>
                    </div>
                  )}

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

          </div>
        );
      })()}
    </div>
  );
}

export default App;