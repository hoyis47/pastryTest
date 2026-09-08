import { useState } from 'react';
import studyList from './studyData.json';

function App() {
  const [mode, setMode] = useState('study');
  const [hiddenState, setHiddenState] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = studyList[currentIndex] || studyList[0];

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

  const formatSpecificGravity = (text) => {
    if (!text || text.trim() === '-' || text.trim() === '') return null;
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

  const renderBlurredText = (textData, isHiddenMode, toggleKey, itemHiddenState, onWordToggle) => {
    const text = typeof textData === 'string' ? textData : textData.text;
    const hiddenWords = typeof textData === 'string' ? [] : (textData.hidden || []);

    if (!isHiddenMode || hiddenWords.length === 0) {
      return <span>{text}</span>;
    }

    const escapedWords = hiddenWords.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    if (escapedWords.length === 0) return <span>{text}</span>;

    const regex = new RegExp(`(${escapedWords.join('|')})`, 'g');
    const parts = text.split(regex);
    const wordOccurrenceCount = {};

    return (
      <span>
        {parts.map((part, i) => {
          const wordIdx = hiddenWords.indexOf(part);
          const isTargetWord = wordIdx !== -1;

          if (isTargetWord) {
            if (wordOccurrenceCount[part] === undefined) {
              wordOccurrenceCount[part] = 0;
            } else {
              wordOccurrenceCount[part] += 1;
            }
            const occurrenceIdx = wordOccurrenceCount[part];
            const uniqueWordKey = `${wordIdx}_${occurrenceIdx}`;
            const isRevealed = !!(itemHiddenState[toggleKey] && itemHiddenState[toggleKey][uniqueWordKey]);

            return (
              <span
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onWordToggle(toggleKey, uniqueWordKey);
                }}
                style={{
                  backgroundColor: isRevealed ? '#dcfce7' : 'transparent',
                  color: isRevealed ? '#15803d' : 'transparent',
                  textDecoration: isRevealed ? 'underline' : 'none',
                  textUnderlineOffset: isRevealed ? '3px' : 'unset',
                  textShadow: isRevealed ? 'none' : '0 0 8px rgba(0,0,0,0.4)',
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

  const formattedGravity = formatSpecificGravity(currentItem?.spec?.specificGravity);

  return (
    <div style={{ padding: '20px 16px', fontFamily: 'sans-serif', maxWidth: '850px', margin: '0 auto', backgroundColor: '#fcfdfa', minHeight: '100vh', textAlign: 'left', boxSizing: 'border-box' }}>
      
      {/* 1. 상단 타이틀 및 모드 전환 탭 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ color: '#0f766e', margin: '0 0 4px 0', fontSize: '22px', fontWeight: 'bold' }}>🥐 제과기능사 공부노트</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>
            {mode === 'study' ? '📖 전체 내용을 확인하며 학습합니다.' : '🎯 터치해서 가려진 내용을 맞추며 복습합니다.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => setMode('study')}
            style={{ 
              padding: '8px 14px', 
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
            onClick={() => setMode('test')}
            style={{ 
              padding: '8px 14px', 
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

      {/* 2. 품목 이동 네비게이션 바 */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <button
          onClick={() => setCurrentIndex(prev => (prev === 0 ? studyList.length - 1 : prev - 1))}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fafafa',
            color: '#374151',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold'
          }}
        >
          ◀ 이전
        </button>

        <select
          value={currentIndex}
          onChange={(e) => setCurrentIndex(Number(e.target.value))}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#1f2937',
            cursor: 'pointer',
            maxWidth: '260px',
            flexGrow: 1,
            textAlign: 'center'
          }}
        >
          {studyList.map((item, idx) => (
            <option key={item.id || idx} value={idx}>
              {item.title}
            </option>
          ))}
        </select>

        <button
          onClick={() => setCurrentIndex(prev => (prev === studyList.length - 1 ? 0 : prev + 1))}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fafafa',
            color: '#374151',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 'bold'
          }}
        >
          다음 ▶
        </button>
      </div>

      {/* 3. 선택된 품목 정보 카드 */}
      {currentItem && (() => {
        const item = currentItem;
        const itemHidden = hiddenState;

        const getSpecCardStyle = (isRevealed) => ({
          backgroundColor: isRevealed ? '#f0fdf4' : '#fafafa',
          border: `1px solid ${isRevealed ? '#bbf7d0' : '#f3f4f6'}`,
          padding: '12px',
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          minWidth: 0,
          transition: 'all 0.2s'
        });

        const getSpecTextStyle = (isRevealed) => ({
          fontSize: '16px',
          color: isRevealed ? '#15803d' : '#374151',
          textDecoration: 'none',
          fontWeight: 'bold',
          filter: isRevealed ? 'none' : 'blur(5px)',
          opacity: isRevealed ? 1 : 0.3,
          wordBreak: 'keep-all'
        });

        return (
          <div 
            key={item.id} 
            style={{ 
              backgroundColor: '#fff',
              border: '1px solid #f3f4f6', 
              borderRadius: '16px', 
              padding: '16px', 
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}
          >
            {/* 품목명 헤더 (페이지 뱃지 태그 제거 및 깔끔한 출력) */}
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              border: '1px solid #bbf7d0', 
              borderRadius: '12px', 
              padding: '12px 16px', 
              marginBottom: '16px'
            }}>
              <h2 style={{ fontSize: '19px', margin: 0, color: '#0f766e', fontWeight: 'bold' }}>
                {item.title}
              </h2>
            </div>

            {/* 공부노트 모드 레이아웃 */}
            {mode === 'study' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' }}>
                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 방법</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'keep-all' }}>{item.spec.mixingMethod}</div>
                </div>

                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 온도</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px' }}>{item.spec.doughTemp}</div>
                </div>

                {formattedGravity && (
                  <div style={{ gridColumn: 'span 2', backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>비중 (기준)</div>
                    <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'keep-all' }}>
                      {formattedGravity}
                    </div>
                  </div>
                )}

                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>오븐 온도</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'keep-all' }}>
                    {item.spec.ovenTemp || '레시피 참조'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>굽기 시간</div>
                  <div style={{ fontSize: '16px', color: '#374151', fontWeight: 'bold', marginTop: '4px', wordBreak: 'keep-all' }}>
                    {item.spec.bakingTime || '레시피 참조'}
                  </div>
                </div>
              </div>
            )}

            {/* 테스트노트 모드 레이아웃 */}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 방법</span>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>반죽 온도</span>
                      <span style={{ fontSize: '12px' }}>{tempRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(tempRevealed)}>
                      {item.spec.doughTemp}
                    </div>
                  </div>

                  {formattedGravity && (
                    <div 
                      onClick={() => toggleWordHidden(`spec_${item.id}_gravity`, '0_0')}
                      style={{ gridColumn: 'span 2', ...getSpecCardStyle(gravityRevealed) }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>비중 (기준)</span>
                        <span style={{ fontSize: '12px' }}>{gravityRevealed ? '👁️' : '🔒'}</span>
                      </div>
                      <div style={getSpecTextStyle(gravityRevealed)}>
                        {formattedGravity}
                      </div>
                    </div>
                  )}

                  <div 
                    onClick={() => toggleWordHidden(`spec_${item.id}_oven`, '0_0')}
                    style={getSpecCardStyle(ovenRevealed)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>오븐 온도</span>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>굽기 시간</span>
                      <span style={{ fontSize: '12px' }}>{bakingRevealed ? '👁️' : '🔒'}</span>
                    </div>
                    <div style={getSpecTextStyle(bakingRevealed)}>
                      {item.spec.bakingTime || '레시피 참조'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 합격포인트 박스 */}
            {item.keyPoint && item.keyPoint.length > 0 && (
              <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', color: '#854d0e' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>🔥 합격포인트</div>
                <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                  {item.keyPoint.map((kp, kpIdx) => {
                    const toggleKey = `kp_${item.id}_${kpIdx}`;
                    return (
                      <li key={kpIdx} style={{ marginBottom: '4px' }}>
                        {renderBlurredText(kp, mode === 'test', toggleKey, itemHidden, toggleWordHidden)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* 공정 순서 목록 */}
            <h3 style={{ fontSize: '15px', color: '#374151', marginBottom: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>📋 단계별 공정 및 주의사항</h3>
            
            {item.process.map((p, idx) => (
              <div key={idx} style={{ marginBottom: '14px', backgroundColor: '#fafafa', padding: '12px', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                <h4 style={{ fontSize: '14px', color: '#0f766e', margin: '0 0 6px 0' }}>
                  {p.step ? `${p.step}. ` : ''}{p.title} {p.specTemp && <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal' }}>({p.specTemp})</span>}
                </h4>
                
                {p.details && p.details.length > 0 && (
                  <ul style={{ paddingLeft: '18px', margin: '0 0 6px 0', color: '#4b5563' }}>
                    {p.details.map((d, dIdx) => {
                      const toggleKey = `process_${item.id}_${idx}_detail_${dIdx}`;
                      return (
                        <li key={dIdx} style={{ marginBottom: '3px', lineHeight: '1.4', fontSize: '13px' }}>
                          {renderBlurredText(d, mode === 'test', toggleKey, itemHidden, toggleWordHidden)}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {p.tips && p.tips.length > 0 && (
                  <div style={{ backgroundColor: '#fff1f2', borderLeft: '3px solid #fecdd3', padding: '8px 10px', borderRadius: '4px', marginTop: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9f1239', fontWeight: 'bold', marginBottom: '2px' }}>⚠️ 주의 및 합격 팁</div>
                    <ul style={{ paddingLeft: '14px', margin: 0, color: '#be123c', fontSize: '12px' }}>
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

            {/* 실습 영상 */}
            {mode === 'study' && item.videos && item.videos.length > 0 && (
              <div style={{ backgroundColor: '#fdfbf7', border: '1px solid #f3edf6', borderRadius: '12px', padding: '14px', marginTop: '20px' }}>
                <h3 style={{ fontSize: '14px', color: '#78350f', margin: '0 0 10px 0' }}>
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
      })()}
    </div>
  );
}

export default App;