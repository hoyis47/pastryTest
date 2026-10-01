import { useState } from 'react';
import studyList from './studyData.json';

function App() {
  const [mode, setMode] = useState('study');

  // 비중 계산기 상태
  const [weightOfBatter, setWeightOfBatter] = useState('');
  const [weightOfWater, setWeightOfWater] = useState('');

  // 테스트노트 항목별 가림 상태 관리 (문장별, 단어/중복단어별 개별 관리)
  const [hiddenState, setHiddenState] = useState({});

  const toggleWordHidden = (toggleKey, uniqueWordKey) => {
    setHiddenState(prev => ({
      ...prev,
      [toggleKey]: {
        ...(prev[toggleKey] || {}),
        [uniqueWordKey]: !((prev[toggleKey] || {})[uniqueWordKey])
      }
    }));
  };

  const calculatedGravity = (weightOfBatter && weightOfWater && Number(weightOfWater) > 0)
    ? (Number(weightOfBatter) / Number(weightOfWater)).toFixed(2)
    : null;

  const isPassed = calculatedGravity !== null && calculatedGravity >= 0.40 && calculatedGravity <= 0.50;

  // 유튜브 URL 임베드 변환 헬퍼
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

  // 비중 문자열 포맷팅 헬퍼 (예: "0.45 ± 0.05" -> "0.45 ± 0.05 (0.40 ~ 0.50)")
  const formatSpecificGravity = (text) => {
    if (!text) return '';
    const match = text.match(/([\d.]+)\s*[±]\s*([\d.]+)/);
    if (match) {
      const center = parseFloat(match[1]);
      const range = parseFloat(match[2]);
      const minVal = (center - range).toFixed(2);
      const maxVal = (center + range).toFixed(2);
      return `${text} (${minVal} ~ ${maxVal})`;
    }
    return text;
  };

  // 텍스트에서 동일한 hidden 단어가 중복되어도 각각 독립적으로 열리도록 처리하는 렌더링 함수
  const renderBlurredText = (textData, isHiddenMode, toggleKey, itemHiddenState, onWordToggle) => {
    const text = typeof textData === 'string' ? textData : textData.text;
    const hiddenWords = typeof textData === 'string' ? [] : (textData.hidden || []);

    if (!isHiddenMode || hiddenWords.length === 0) {
      return <span>{text}</span>;
    }

    // 겹침 방지 및 정확한 분할을 위해 정규식 구성
    const escapedWords = hiddenWords.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    if (escapedWords.length === 0) return <span>{text}</span>;

    const regex = new RegExp(`(${escapedWords.join('|')})`, 'g');
    const parts = text.split(regex);

    // 중복 단어의 등장 순서를 카운트하기 위한 맵 객체 생성
    const wordOccurrenceCount = {};

    return (
      <span>
        {parts.map((part, i) => {
          const wordIdx = hiddenWords.indexOf(part);
          const isTargetWord = wordIdx !== -1;

          if (isTargetWord) {
            // 해당 단어가 이 문장 안에서 몇 번째로 등장하는지 카운트 (중복 처리 핵심)
            if (wordOccurrenceCount[part] === undefined) {
              wordOccurrenceCount[part] = 0;
            } else {
              wordOccurrenceCount[part] += 1;
            }
            const occurrenceIdx = wordOccurrenceCount[part];

            // 상태 관리를 위한 고유 키 생성 (단어 인덱스 + 등장 순번 조합)
            const uniqueWordKey = `${wordIdx}_${occurrenceIdx}`;
            
            // 해당 고유 단어의 열림 여부 확인
            const isRevealed = !!(itemHiddenState[toggleKey] && itemHiddenState[toggleKey][uniqueWordKey]);

            return (
              <span
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onWordToggle(toggleKey, uniqueWordKey);
                }}
                style={{
                  // 열렸을 때 1번 스카이블루 톤 배경색 + 블루 글자색 + 밑줄
                  backgroundColor: isRevealed ? '#e0f2fe' : 'transparent',
                  color: isRevealed ? '#0284c7' : 'transparent',
                  textDecoration: isRevealed ? 'underline' : 'none',
                  textUnderlineOffset: isRevealed ? '3px' : 'unset',
                  textShadow: isRevealed ? 'none' : '0 0 8px rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  userSelect: 'none',
                  display: 'inline-block',
                  margin: '0 2px',
                  transition: 'all 0.2s'
                }}
                title={isRevealed ? '클릭해서 다시 숨기기' : '클릭해서 정답 보기'}
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div style={{ padding: '16px', fontFamily: 'sans-serif', maxWidth: '850px', margin: '0 auto', backgroundColor: '#f9fafb', minHeight: '100vh', textAlign: 'left', boxSizing: 'border-box' }}>
      
      {/* 상단 타이틀 및 모드 전환 탭 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ color: '#d97706', margin: '0 0 4px 0', fontSize: '22px' }}>🥐 제과기능사 공부노트</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '13px' }}>
            {mode === 'study' ? '📖 전체 내용을 확인하며 학습합니다.' : '🎯 터치해서 가려진 내용을 맞추며 복습합니다.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => setMode('study')}
            style={{ 
              padding: '8px 14px', 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: mode === 'study' ? '#d97706' : '#e5e7eb', 
              color: mode === 'study' ? '#fff' : '#4b5563', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            📖 공부노트
          </button>
          <button 
            onClick={() => setMode('test')}
            style={{ 
              padding: '8px 14px', 
              borderRadius: '8px', 
              border: 'none', 
              backgroundColor: mode === 'test' ? '#16a34a' : '#e5e7eb', 
              color: mode === 'test' ? '#fff' : '#4b5563', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            🎯 테스트노트
          </button>
        </div>
      </div>
      
      {studyList.map((item) => {
        const itemHidden = hiddenState;

        // 윗부분 5개 스펙 카드의 공부노트풍 배경 스타일 (열림 여부에 따라 배경/테두리 미세 조정)
        const getSpecCardStyle = (isRevealed) => ({
          backgroundColor: isRevealed ? '#f1f5f9' : '#f8fafc',
          border: `1px solid ${isRevealed ? '#cbd5e1' : '#e2e8f0'}`,
          padding: '12px',
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          minWidth: 0,
          transition: 'all 0.2s'
        });

        const getSpecTextStyle = (isRevealed) => ({
          fontSize: '17px',
          color: isRevealed ? '#7c3aed' : '#0f172a',
          textDecoration: 'none',
          fontWeight: 'bold',
          filter: isRevealed ? 'none' : 'blur(5px)',
          opacity: isRevealed ? 1 : 0.3,
          wordBreak: 'keep-all'
        });

        // 비중 텍스트 가공 적용 (예: 0.45 ± 0.05 -> 0.45 ± 0.05 (0.40 ~ 0.50))
        const formattedGravity = formatSpecificGravity(item.spec.specificGravity);

        return (
          <div 
            key={item.id} 
            style={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb', 
              borderRadius: '16px', 
              padding: '16px', 
              marginBottom: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f3f4f6', paddingBottom: '12px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '20px', margin: 0, color: '#1f2937' }}>{item.title}</h2>
              <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                {item.category}
              </span>
            </div>

            {/* 1. 공부노트 모드 레이아웃 */}
            {mode === 'study' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>반죽 방법</div>
                  <div style={{ fontSize: '17px', color: '#0f172a', fontWeight: 'bold', marginTop: '6px', wordBreak: 'keep-all' }}>{item.spec.mixingMethod}</div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>반죽 온도</div>
                  <div style={{ fontSize: '17px', color: '#0f172a', fontWeight: 'bold', marginTop: '6px' }}>{item.spec.doughTemp}</div>
                </div>

                <div style={{ gridColumn: 'span 2', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>비중 (기준)</div>
                  <div style={{ fontSize: '17px', color: '#0f172a', fontWeight: 'bold', marginTop: '6px', wordBreak: 'keep-all' }}>
                    {formattedGravity}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>오븐 온도</div>
                  <div style={{ fontSize: '17px', color: '#0f172a', fontWeight: 'bold', marginTop: '6px', wordBreak: 'keep-all' }}>
                    {item.spec.ovenTemp || '레시피 참조'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>굽기 시간</div>
                  <div style={{ fontSize: '17px', color: '#0f172a', fontWeight: 'bold', marginTop: '6px', wordBreak: 'keep-all' }}>
                    {item.spec.bakingTime || '레시피 참조'}
                  </div>
                </div>
              </div>
            )}

            {/* 2. 테스트노트 모드 레이아웃 (공부노트풍 스펙 카드 배경 + 검정 레이블) */}
            {mode === 'test' && (() => {
              const mixRevealed = !!(hiddenState[`spec_${item.id}_mixing`]?.['0_0']);
              const tempRevealed = !!(hiddenState[`spec_${item.id}_temp`]?.['0_0']);
              const gravityRevealed = !!(hiddenState[`spec_${item.id}_gravity`]?.['0_0']);
              const ovenRevealed = !!(hiddenState[`spec_${item.id}_oven`]?.['0_0']);
              const bakingRevealed = !!(hiddenState[`spec_${item.id}_baking`]?.['0_0']);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' }}>
                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_mixing`, '0_0')}
                    style={getSpecCardStyle(mixRevealed)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>반죽 방법</span>
                      <span style={{ fontSize: '12px' }}>{mixRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(mixRevealed)}>
                      {item.spec.mixingMethod}
                    </div>
                  </div>

                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_temp`, '0_0')}
                    style={getSpecCardStyle(tempRevealed)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>반죽 온도</span>
                      <span style={{ fontSize: '12px' }}>{tempRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(tempRevealed)}>
                      {item.spec.doughTemp}
                    </div>
                  </div>

                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_gravity`, '0_0')}
                    style={{ gridColumn: 'span 2', ...getSpecCardStyle(gravityRevealed) }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>비중 (기준)</span>
                      <span style={{ fontSize: '12px' }}>{gravityRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(gravityRevealed)}>
                      {formattedGravity}
                    </div>
                  </div>

                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_oven`, '0_0')}
                    style={getSpecCardStyle(ovenRevealed)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>오븐 온도</span>
                      <span style={{ fontSize: '12px' }}>{ovenRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(ovenRevealed)}>
                      {item.spec.ovenTemp || '레시피 참조'}
                    </div>
                  </div>

                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_baking`, '0_0')}
                    style={getSpecCardStyle(bakingRevealed)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: 'bold' }}>굽기 시간</span>
                      <span style={{ fontSize: '12px' }}>{bakingRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(bakingRevealed)}>
                      {item.spec.bakingTime || '레시피 참조'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 🧮 실시간 비중 계산기 박스 */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', color: '#166534', margin: '0 0 10px 0' }}>
                🧮 실시간 비중 계산기
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#15803d', fontWeight: 'bold', marginBottom: '4px' }}>반죽의 무게 (g)</label>
                  <input 
                    type="number" 
                    placeholder="예: 180" 
                    value={weightOfBatter}
                    onChange={(e) => setWeightOfBatter(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ fontSize: '16px', color: '#64748b', paddingTop: '16px' }}>÷</div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#15803d', fontWeight: 'bold', marginBottom: '4px' }}>같은 용적 물의 무게 (g)</label>
                  <input 
                    type="number" 
                    placeholder="예: 400" 
                    value={weightOfWater}
                    onChange={(e) => setWeightOfWater(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ paddingTop: '8px', width: '100%' }}>
                  {calculatedGravity ? (
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: isPassed ? '#15803d' : '#dc2626' }}>
                      계산값: {calculatedGravity} {isPassed ? '✅ (합격 범위!)' : '❌ (범위 이탈!)'}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b' }}>값을 입력해 주세요</div>
                  )}
                </div>
              </div>
            </div>

            {/* 합격포인트 박스 */}
            {item.keyPoint && item.keyPoint.length > 0 && (
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginBottom: '20px', color: '#92400e' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>🔥 합격포인트</div>
                <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                  {item.keyPoint.map((kp, kpIdx) => {
                    const toggleKey = `kp_${item.id}_${kpIdx}`;
                    return (
                      <li key={kpIdx} style={{ marginBottom: '6px' }}>
                        {renderBlurredText(kp, mode === 'test', toggleKey, itemHidden, toggleWordHidden)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* 공정 순서 목록 (details 및 tips) */}
            <h3 style={{ fontSize: '16px', color: '#374151', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '6px' }}>📋 단계별 공정 및 주의사항</h3>
            
            {item.process.map((p, idx) => (
              <div key={idx} style={{ marginBottom: '16px', backgroundColor: '#fdfbf7', padding: '12px', borderRadius: '8px', border: '1px solid #f3edf6' }}>
                <h4 style={{ fontSize: '15px', color: '#b45309', margin: '0 0 8px 0' }}>
                  {p.step ? `${p.step}. ` : ''}{p.title} {p.specTemp && <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 'normal' }}>({p.specTemp})</span>}
                </h4>
                
                {p.details && p.details.length > 0 && (
                  <ul style={{ paddingLeft: '18px', margin: '0 0 8px 0', color: '#374151' }}>
                    {p.details.map((d, dIdx) => {
                      const toggleKey = `process_${item.id}_${idx}_detail_${dIdx}`;
                      return (
                        <li key={dIdx} style={{ marginBottom: '4px', lineHeight: '1.4', fontSize: '13px' }}>
                          {renderBlurredText(d, mode === 'test', toggleKey, itemHidden, toggleWordHidden)}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {p.tips && p.tips.length > 0 && (
                  <div style={{ backgroundColor: '#fef2f2', borderLeft: '3px solid #ef4444', padding: '8px 10px', borderRadius: '4px', marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 'bold', marginBottom: '2px' }}>⚠️ 주의 및 합격 팁</div>
                    <ul style={{ paddingLeft: '14px', margin: 0, color: '#991b1b', fontSize: '12px' }}>
                      {p.tips.map((t, tIdx) => {
                        const toggleKey = `process_${item.id}_${idx}_tip_${tIdx}`;
                        return (
                          <li key={tIdx} style={{ marginBottom: '2px', lineHeight: '1.3' }}>
                            {renderBlurredText(t, mode === 'test', toggleKey, itemHidden, toggleWordHidden)}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* 🎥 실습 및 공정 영상 (노트 맨 마지막, 공부노트 모드에서만 노출) */}
            {mode === 'study' && item.videos && item.videos.length > 0 && (
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '15px', marginTop: '20px' }}>
                <h3 style={{ fontSize: '15px', color: '#1d4ed8', margin: '0 0 10px 0' }}>
                  🎥 실습 및 공정 영상 ({item.videos.length}개)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {item.videos.map((videoUrl, vIdx) => (
                    <div key={vIdx} style={{ position: 'relative', width: '100%', paddingTop: '56.25%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                      <iframe 
                        src={getEmbedUrl(videoUrl)} 
                        title={`YouTube video ${vIdx + 1}`}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}

export default App;