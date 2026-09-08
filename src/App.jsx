import { useState } from 'react';
import studyList from './studyData.json';

function App() {
  const [mode, setMode] = useState('study');
  const [hiddenState, setHiddenState] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = studyList[currentIndex] || studyList[0];

  // 품목 이동 함수 (이동 시 블러 열람 상태 자동 초기화)
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

  const renderPlainText = (textData) => {
    return typeof textData === 'string' ? textData : textData.text;
  };

  const formattedGravity = formatSpecificGravity(currentItem?.spec?.specificGravity);

  return (
    <div style={{ padding: '20px 16px', fontFamily: 'sans-serif', maxWidth: '850px', margin: '0 auto', backgroundColor: '#fcfdfa', minHeight: '100vh', textAlign: 'left', boxSizing: 'border-box' }}>
      
      {/* 1. 상단 타이틀 및 모드 전환 탭 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ color: '#0f766e', margin: '0 0 4px 0', fontSize: '22px', fontWeight: 'bold' }}>🥐 제과기능사 공부노트</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '13px' }}>
            우리 모두 합격까지 힘내봐요! 🍀
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
            onClick={() => {
              setMode('test');
              setHiddenState({});
            }}
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
          onClick={() => changeItem(currentIndex === 0 ? studyList.length - 1 : currentIndex - 1)}
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
          onChange={(e) => changeItem(Number(e.target.value))}
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
          onClick={() => changeItem(currentIndex === studyList.length - 1 ? 0 : currentIndex + 1)}
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
        const hasNote = Boolean(item?.spec?.note && item.spec.note.trim() !== '');

        const getSpecCardStyle = (isRevealed, isHighlight = false) => ({
          backgroundColor: isRevealed 
            ? (isHighlight ? '#fffbeb' : '#f0fdf4') 
            : '#fafafa',
          border: `1px solid ${
            isRevealed 
              ? (isHighlight ? '#fde68a' : '#bbf7d0') 
              : '#f3f4f6'
          }`,
          padding: '12px',
          borderRadius: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          minWidth: 0,
          transition: 'all 0.2s'
        });

        const getSpecTextStyle = (isRevealed, isHighlight = false) => ({
          fontSize: '16px',
          color: isRevealed 
            ? (isHighlight ? '#b45309' : '#15803d') 
            : '#374151',
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
            {/* 품목명 헤더 */}
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

            {/* 공부노트 모드 레이아웃 (정답 상시 표시) */}
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

                {/* 주의사항 카드 */}
                {hasNote && (
                  <div style={{ gridColumn: 'span 2', backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fef3c7', minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 'bold' }}>⚡ 주의사항</div>
                    <div style={{ fontSize: '15px', color: '#92400e', fontWeight: 'bold', marginTop: '4px', wordBreak: 'keep-all' }}>
                      {item.spec.note}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 테스트노트 모드 레이아웃 (블러 처리 & 터치 토글) */}
            {mode === 'test' && (() => {
              const mixRevealed = !!(hiddenState[`spec_${item.id}_mixing`]?.['0_0']);
              const tempRevealed = !!(hiddenState[`spec_${item.id}_temp`]?.['0_0']);
              const gravityRevealed = !!(hiddenState[`spec_${item.id}_gravity`]?.['0_0']);
              const ovenRevealed = !!(hiddenState[`spec_${item.id}_oven`]?.['0_0']);
              const bakingRevealed = !!(hiddenState[`spec_${item.id}_baking`]?.['0_0']);
              const noteRevealed = !!(hiddenState[`spec_${item.id}_note`]?.['0_0']);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {/* 반죽 방법 */}
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

                  {/* 반죽 온도 */}
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

                  {/* 비중 */}
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

                  {/* 오븐 온도 */}
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

                  {/* 굽기 시간 */}
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

                  {/* 주의사항 블러 카드 */}
                  {hasNote && (
                    <div 
                      onClick={() => toggleWordHidden(`spec_${item.id}_note`, '0_0')}
                      style={{ gridColumn: 'span 2', ...getSpecCardStyle(noteRevealed, true) }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 'bold' }}>⚡ 주의사항</span>
                        <span style={{ fontSize: '12px' }}>{noteRevealed ? '👁️' : '🔒'}</span>
                      </div>
                      <div style={getSpecTextStyle(noteRevealed, true)}>
                        {item.spec.note}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 공부노트 모드에서만 동영상과 정리노트 노출 */}
            {mode === 'study' && (
              <>
                {/* 1. 동영상 영역 */}
                {item.videos && item.videos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', marginBottom: '20px' }}>
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
                            padding: '12px 14px' 
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px' }}>🎬</span>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#44403c', wordBreak: 'keep-all' }}>
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

                    {/* 마지막 영상 아래 일부공개 안내 문구 */}
                    <div style={{ 
                      fontSize: '11.5px', 
                      color: '#9ca3af', 
                      textAlign: 'center', 
                      marginTop: '-4px', 
                      lineHeight: '1.4', 
                      wordBreak: 'keep-all',
                      padding: '0 8px'
                    }}>
                      ※ 본 실습 영상은 학습자 전용 일부공개 영상이므로, 외부 링크 유출 없이 이곳에서만 시청해 주시기 바랍니다.
                    </div>
                  </div>
                )}

                {/* 2. 정리노트 박스 (1., 2. 형태 항목은 자동 한 칸 들여쓰기) */}
                {item.keyPoint && item.keyPoint.length > 0 && (
                  <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '12px 14px', marginTop: item.videos && item.videos.length > 0 ? '0' : '20px', color: '#854d0e' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>📝 정리노트</div>
                    <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                      {item.keyPoint.map((kp, kpIdx) => {
                        const rawText = renderPlainText(kp);
                        const isNumberedList = /^\s*(\d+\.|\(\d+\)|[①-⑩])/.test(rawText);

                        return (
                          <li 
                            key={kpIdx} 
                            style={{ 
                              marginBottom: '4px',
                              marginLeft: isNumberedList ? '14px' : '0px',
                              listStyleType: isNumberedList ? 'none' : 'disc'
                            }}
                          >
                            {rawText}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}

          </div>
        );
      })()}
    </div>
  );
}

export default App;