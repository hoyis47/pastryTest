import React, { useState, useEffect, useMemo, useRef } from 'react';
import studyList from './studyData.js'; // ✨ .js 파일 import

// ----------------------------------------------------
// 🎲 [컴포넌트] 테스트모드용 공정 순서 맞추기 뽑기통 게임
// ----------------------------------------------------
function StepFlowTestGame({ steps, itemId }) {
  // 섞인 캡슐 풀 (아직 배치되지 않은 아이템들)
  const [capsulePool, setCapsulePool] = useState([]);
  // 사용자가 1, 2, 3... 슬롯에 배치한 결과 (배열 인덱스 = 순서)
  const [placedSlots, setPlacedSlots] = useState([]);

  // 품목 변경 시 캡슐 섞기 및 초기화
  useEffect(() => {
    resetGame();
  }, [steps, itemId]);

  const resetGame = () => {
    // 원본 단계를 무작위로 섞음 (뽑기통 느낌의 미세 회전각 추가)
    const shuffled = [...steps]
      .map(item => ({ ...item, randomTilt: (Math.random() - 0.5) * 16 }))
      .sort(() => Math.random() - 0.5);

    setCapsulePool(shuffled);
    setPlacedSlots(new Array(steps.length).fill(null));
  };

  // 캡슐을 슬롯에 배치
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

  // 슬롯에 놓인 캡슐을 다시 뽑기통으로 반환
  const returnToPool = (slotIndex) => {
    const item = placedSlots[slotIndex];
    if (!item) return;

    setPlacedSlots(prev => prev.map((s, idx) => (idx === slotIndex ? null : s)));
    setCapsulePool(prev => [...prev, item]);
  };

  // 가장 첫 번째 빈 슬롯 탐색
  const findFirstEmptySlot = () => {
    return placedSlots.findIndex(slot => slot === null);
  };

  // 캡슐 터치 시 첫 빈 슬롯으로 자동 이동
  const handleCapsuleClick = (capsule) => {
    const firstEmpty = findFirstEmptySlot();
    if (firstEmpty !== -1) {
      placeCapsuleIntoSlot(capsule, firstEmpty);
    }
  };

  // 정답 판독
  const isFilled = placedSlots.length > 0 && placedSlots.every(s => s !== null);
  const isAllCorrect = isFilled && placedSlots.every((step, idx) => step && step.id === idx);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      
      {/* 1. 상단: 순서 맞추기 배치 슬롯 (콤팩트한 여백 + 테두리 걸터앉기/원형 중앙 번호) */}
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

        {/* 한눈에 보이는 줄바꿈 트랙 (불필요한 세로 여백 최소화) */}
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
                {/* 📌 1) 채워졌을 때: 원의 테두리 선 위에 딱 붙어 걸터앉는 슬림 라벨 */}
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

                {/* 📌 2) 내용 표시: 비어있을 때는 원 내부 중앙에 은은한 회색 숫자로 순서 표기 */}
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

      {/* 2. 하단: 뽑기통 기계 (캡슐 컨테이너) */}
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
        {/* ✨ 줄바꿈을 적용해 어설픈 강제 분할을 방지한 상단 헤더 */}
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

        {/* 섞여 있는 원형 캡슐 목록 */}
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

        {/* 성공 축하 배너 */}
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
// 🧭 [컴포넌트] 공정플로우 뷰 (공부모드: 기존 뷰 / 테스트모드: 뽑기통 게임)
// ----------------------------------------------------
function StepFlowView({ contentData, renderFormattedNotes, mode, itemId }) {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef([]);

  // 텍스트/배열 데이터를 바탕으로 단계 분리 파싱
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

      // 제목 내부에 (단어,단어)가 있으면 원형 글자로 채택
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

  // 품목 변경 시 첫 번째 단계로 리셋
  useEffect(() => {
    setActiveStep(0);
  }, [contentData, mode, itemId]);

  if (steps.length === 0) return null;

  // 🎯 테스트 모드: 뽑기 기계 컴포넌트 호출
  if (mode === 'test') {
    return <StepFlowTestGame steps={steps} itemId={itemId} />;
  }

  // 📖 공부 모드: 가로 1열 트랙 및 하단 설명 박스 렌더링
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
      
      {/* 1. 원형 노드 가로 1열 트랙 */}
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

      {/* 2. 한 손 조작용 이전/다음 이동 바 */}
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

      {/* 3. 공부모드 전용 세부 내용 박스 */}
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
              {/* 스텝 뱃지 & 제목 */}
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

              {/* 본문 내용 */}
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
// 🏠 메인 App 컴포넌트
// ----------------------------------------------------
function App() {
  const [mode, setMode] = useState('study');
  const [hiddenState, setHiddenState] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🔒 동영상 열람 권한 상태 관리
  const [hasVideoAccess, setHasVideoAccess] = useState(false);

  // 본인만 아는 비밀 접근 키
  const SECRET_ACCESS_KEY = 'cookie2026';

  useEffect(() => {
    // 1. 이미 인증받은 브라우저인지 확인
    const isVip = localStorage.getItem('hasVideoAccess') === 'true';
    if (isVip) {
      setHasVideoAccess(true);
      return;
    }

    // 2. URL 파라미터(?access=...) 체크
    const params = new URLSearchParams(window.location.search);
    const accessKey = params.get('access');

    if (accessKey === SECRET_ACCESS_KEY) {
      localStorage.setItem('hasVideoAccess', 'true');
      setHasVideoAccess(true);

      // 주소창에서 파라미터 흔적 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const currentItem = studyList[currentIndex] || studyList[0];

  // 품목 이동 함수 (이동 시 블러 상태 초기화)
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

  // 비중 데이터를 [핵심 기준값, 참고용 오차/범위]로 분리하는 함수
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

  // 📝 사용자 정의 규칙 기반 정리노트 포맷팅 렌더러
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
      
      {/* 1. 상단 헤더 & 모드 전환 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px', borderBottom: '1px solid #e5e7eb', paddingBottom: '14px' }}>
        <div>
          <h1 style={{ color: '#0f766e', margin: '0 0 4px 0', fontSize: '21px', fontWeight: 'bold' }}>🥐 제과기능사 공부노트</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>
            우리 모두 합격까지 힘내보아요! 🍀
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => setMode('study')}
            style={{ 
              padding: '7px 13px', 
              borderRadius: '8px', 
              border: '1px solid ' + (mode === 'study' ? '#86efac' : '#e5e7eb'), 
              backgroundColor: mode === 'study' ? '#f0fdf4' : '#fff', 
              color: mode === 'study' ? '#166534' : '#6b7280', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '13px' 
            }}
          >
            📖 공부노트
          </button>
          <button 
            onClick={() => {
              setMode('test');
              setHiddenState({});
            }}
            style={{ 
              padding: '7px 13px', 
              borderRadius: '8px', 
              border: '1px solid ' + (mode === 'test' ? '#86efac' : '#e5e7eb'), 
              backgroundColor: mode === 'test' ? '#f0fdf4' : '#fff', 
              color: mode === 'test' ? '#166534' : '#6b7280', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '13px' 
            }}
          >
            🎯 테스트노트
          </button>
        </div>
      </div>

      {/* 2. 본문 카드 */}
      {currentItem && (() => {
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
            {/* 슬림형 네비게이션 헤더 */}
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
                  border: '1px solid #a7f3d0',
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
                  border: '1px solid #a7f3d0',
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

            {/* 공부노트 모드 상단 스펙 레이아웃 */}
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

            {/* 테스트노트 모드 상단 스펙 레이아웃 */}
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

            {/* 공부노트 모드 동영상 */}
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

            {/* ---------------------------------------------------------------- */}
            {/* 공정플로우 및 상세과정설명 영역 */}
            {/* ---------------------------------------------------------------- */}
            {(() => {
              const summaryContent = item.summary || item.keyPoint;
              const hasSummary = Array.isArray(summaryContent) ? summaryContent.length > 0 : Boolean(summaryContent);

              const detailContent = item.detail;
              const hasDetail = Boolean(detailContent && String(detailContent).trim() !== '');

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '24px' }}>
                  
                  {/* ✨ 공정플로우 */}
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
                          {mode === 'test' ? '공정 순서 맞추기 (뽑기통)' : '공정플로우 (터치하여 확인)'}
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

                  {/* 📋 [공부노트 모드 전용] 상세과정설명 */}
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