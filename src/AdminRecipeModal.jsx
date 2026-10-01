// AdminRecipeModal.jsx
import React, { useState, useEffect } from 'react';

export default function AdminRecipeModal({ isOpen, onClose, targetRecipe, onSaved, secretKey }) {
  const [formData, setFormData] = useState({
    id: null,
    category: '',
    title: '',
    spec: {
      mixingMethod: '',
      doughTemp: '',
      specificGravity: '',
      ovenTemp: '',
      bakingTime: '',
      note: ''
    },
    mixingType: '수작업',
    isWarmed: '0',
    isSacrifice: '0',
    videoUrl: '',
    summary: '',
    detail: '',
    isSummaryPublished: false,
    isDetailPublished: false
  });

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (targetRecipe) {
      setFormData({
        id: targetRecipe.id,
        category: targetRecipe.category || '',
        title: targetRecipe.title || '',
        spec: {
          mixingMethod: targetRecipe.spec?.mixingMethod || '',
          doughTemp: targetRecipe.spec?.doughTemp || '',
          specificGravity: targetRecipe.spec?.specificGravity || '',
          ovenTemp: targetRecipe.spec?.ovenTemp || '',
          bakingTime: targetRecipe.spec?.bakingTime || '',
          note: targetRecipe.spec?.note || ''
        },
        mixingType: targetRecipe.mixingType || '수작업',
        isWarmed: String(targetRecipe.isWarmed || '0'),
        isSacrifice: String(targetRecipe.isSacrifice || '0'),
        videoUrl: targetRecipe.videos?.[0]?.url || '',
        summary: targetRecipe.rawSummary !== undefined ? targetRecipe.rawSummary : (targetRecipe.summary || ''),
        detail: targetRecipe.rawDetail !== undefined ? targetRecipe.rawDetail : (targetRecipe.detail || ''),
        isSummaryPublished: Boolean(targetRecipe.isSummaryPublished),
        isDetailPublished: Boolean(targetRecipe.isDetailPublished)
      });
    } else {
      setFormData({
        id: null,
        category: '',
        title: '',
        spec: { mixingMethod: '', doughTemp: '', specificGravity: '', ovenTemp: '', bakingTime: '', note: '' },
        mixingType: '수작업',
        isWarmed: '0',
        isSacrifice: '0',
        videoUrl: '',
        summary: '',
        detail: '',
        isSummaryPublished: false,
        isDetailPublished: false
      });
    }
  }, [targetRecipe, isOpen]);

  if (!isOpen) return null;

  // 🪄 Gemini AI 요약/상세 자동 추출
  const handleAiGenerate = async () => {
    if (!formData.videoUrl) {
      alert('유튜브 영상 URL을 입력해 주세요.');
      return;
    }
    try {
      setIsAiLoading(true);
      const res = await fetch('/api/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: formData.videoUrl,
          title: formData.title,
          adminPassword: secretKey
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = 'AI 추출 실패';
        try {
          const errObj = JSON.parse(errText);
          errMsg = errObj.error || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        summary: data.summary || prev.summary,
        detail: data.detail || prev.detail
      }));
      alert('AI 추출이 완료되었습니다! 내용을 확인하고 편집해 주세요.');
    } catch (e) {
      alert(`AI 자동생성 오류: ${e.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // 💾 DB에 저장
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('품목명을 입력해 주세요.');
      return;
    }
    try {
      setIsSaving(true);
      const videos = formData.videoUrl.trim()
        ? [{ title: formData.title, url: formData.videoUrl.trim() }]
        : [];

      // 기호 제거 정제 로직
      const cleanDoughTemp = (formData.spec.doughTemp || '').replace(/℃/g, '').trim();
      const cleanOvenTemp = (formData.spec.ovenTemp || '').replace(/℃/g, '').trim();
      const cleanBakingTime = (formData.spec.bakingTime || '').replace(/분/g, '').trim();
      const cleanGravity = (formData.spec.specificGravity || '').replace(/±.*$/, '').trim();

      const payload = {
        ...formData,
        spec: {
          ...formData.spec,
          doughTemp: cleanDoughTemp,
          ovenTemp: cleanOvenTemp,
          bakingTime: cleanBakingTime,
          specificGravity: cleanGravity
        },
        videos,
        adminPassword: secretKey
      };

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '저장 실패');
      }

      alert('성공적으로 저장되었습니다!');
      onSaved();
      onClose();
    } catch (e) {
      alert(`저장 오류: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '16px', boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '640px',
        maxHeight: '90vh', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f766e', margin: 0 }}>
            {formData.id ? `✏️ [${formData.title}] 수정` : '➕ 새 제과 품목 등록'}
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>

        {/* 1. 기본 정보 & 유튜브 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>시험시간 (category)</label>
            <input
              type="text"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              placeholder="예: 2시간 또는 120분"
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>품목명 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="예: 쇼트 브레드 쿠키"
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box', marginTop: '4px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>유튜브 영상 URL</label>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <input
              type="text"
              value={formData.videoUrl}
              onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="https://youtu.be/..."
              style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            />
            <button
              onClick={handleAiGenerate}
              disabled={isAiLoading}
              style={{
                backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px',
                padding: '0 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {isAiLoading ? '⏳ AI 분석 중...' : '🪄 AI 요약/상세 추출'}
            </button>
          </div>
        </div>

        {/* 2. 5대 스펙 수동 입력 (기호 없이 숫자 위주 입력) */}
        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e', display: 'block', marginBottom: '8px' }}>
            📊 시험 규격 스펙 (온도/비중 기호 없이 숫자만 입력)
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>반죽법</span>
              <input
                type="text"
                value={formData.spec.mixingMethod}
                onChange={e => setFormData({ ...formData, spec: { ...formData.spec, mixingMethod: e.target.value } })}
                placeholder="예: 크림법"
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>반죽온도 (숫자만)</span>
              <input
                type="text"
                value={formData.spec.doughTemp}
                onChange={e => setFormData({ ...formData, spec: { ...formData.spec, doughTemp: e.target.value } })}
                placeholder="예: 20"
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>비중 (기준 숫자만)</span>
              <input
                type="text"
                value={formData.spec.specificGravity}
                onChange={e => setFormData({ ...formData, spec: { ...formData.spec, specificGravity: e.target.value } })}
                placeholder="예: 0.55 또는 -"
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>오븐온도 (윗불 / 밑불)</span>
              <input
                type="text"
                value={formData.spec.ovenTemp}
                onChange={e => setFormData({ ...formData, spec: { ...formData.spec, ovenTemp: e.target.value } })}
                placeholder="예: 180 / 160"
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>굽기시간 (분)</span>
              <input
                type="text"
                value={formData.spec.bakingTime}
                onChange={e => setFormData({ ...formData, spec: { ...formData.spec, bakingTime: e.target.value } })}
                placeholder="예: 25 또는 25~30"
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>특이사항</span>
              <input
                type="text"
                value={formData.spec.note}
                onChange={e => setFormData({ ...formData, spec: { ...formData.spec, note: e.target.value } })}
                placeholder="예: 냉장휴지 30분"
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* ✨ 반죽타입 / 가온법 / 희생반죽 선택 필드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '3px' }}>반죽 방식</span>
              <select
                value={formData.mixingType}
                onChange={e => setFormData({ ...formData, mixingType: e.target.value })}
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', fontSize: '12px' }}
              >
                <option value="수작업">수작업</option>
                <option value="기계사용">기계사용</option>
                <option value="그외">그외</option>
              </select>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '3px' }}>가온법 여부</span>
              <select
                value={formData.isWarmed}
                onChange={e => setFormData({ ...formData, isWarmed: e.target.value })}
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', fontSize: '12px' }}
              >
                <option value="0">비가온 (미적용)</option>
                <option value="1">가온 (적용)</option>
              </select>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155', display: 'block', marginBottom: '3px' }}>희생반죽 여부</span>
              <select
                value={formData.isSacrifice}
                onChange={e => setFormData({ ...formData, isSacrifice: e.target.value })}
                style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', fontSize: '12px' }}
              >
                <option value="0">사용안함</option>
                <option value="1">사용함</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. 공정 요약 (summary) 및 공개 토글 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
              🧭 공정 요약 (summary - 마크다운)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: formData.isSummaryPublished ? '#16a34a' : '#94a3b8' }}>
              <input
                type="checkbox"
                checked={formData.isSummaryPublished}
                onChange={e => setFormData({ ...formData, isSummaryPublished: e.target.checked })}
              />
              {formData.isSummaryPublished ? '공개됨 🟢' : '비공개(정리중) 🔒'}
            </label>
          </div>
          <textarea
            rows={6}
            value={formData.summary}
            onChange={e => setFormData({ ...formData, summary: e.target.value })}
            placeholder="### [1단계] 재료 정리 (재료, 4개그릇)..."
            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', boxSizing: 'border-box' }}
          />
        </div>

        {/* 4. 상세 설명 (detail) 및 공개 토글 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
              📋 상세과정설명 (detail - 마크다운)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: formData.isDetailPublished ? '#16a34a' : '#94a3b8' }}>
              <input
                type="checkbox"
                checked={formData.isDetailPublished}
                onChange={e => setFormData({ ...formData, isDetailPublished: e.target.checked })}
              />
              {formData.isDetailPublished ? '공개됨 🟢' : '비공개(정리중) 🔒'}
            </label>
          </div>
          <textarea
            rows={8}
            value={formData.detail}
            onChange={e => setFormData({ ...formData, detail: e.target.value })}
            placeholder="[1] 재료 전처리..."
            style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', boxSizing: 'border-box' }}
          />
        </div>

        {/* 하단 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px' }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#0f766e',
              color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px'
            }}
          >
            {isSaving ? '저장 중...' : '💾 DB에 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
}