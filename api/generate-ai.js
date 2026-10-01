// api/generate-ai.js

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, title, adminPassword } = request.body;

    if (adminPassword !== 'cookie2026') {
      return response.status(401).json({ error: '인증에 실패했습니다.' });
    }

    if (!videoUrl) {
      return response.status(400).json({ error: '유튜브 URL이 필요합니다.' });
    }

    // Vercel 환경 변수 GEMINI_API_KEY 사용
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
    }

    
    const prompt = `
당신은 대한민국 제과기능사 국가기술자격 실기 시험 학습 데이터 정리 전문가입니다.
대상 품목: "${title || '제과 실기 품목'}"
참고 영상 링크: "${videoUrl}"

제과기능사 공식 시험 출제 기준 및 표준 실기 공정 규격에 맞추어 아래 JSON 형식으로 데이터를 생성해 주세요.
수치를 특정할 수 없는 항목은 빈칸("") 또는 "-"로 채워주세요.

[작성 규칙]
1. summary (상단 공정 요약 및 캡슐 게임용):
   - 각 단계 제목은 반드시 "### [1단계] 단계제목 (키워드1, 키워드2)" 형식으로 작성할 것.
   - 괄호 안 키워드는 모바일 원형 캡슐에 들어갈 핵심 단어로 1~2단어(최대 3단어), 쉼표로 구분할 것.
   - 각 단계 본문은 하이픈 불릿(-) 2~3줄로 행동 요령만 간결히 요약할 것.
2. detail (하단 상세 학습노트용):
   - 단계는 "[1] 단계명", "[2] 단계명" 형식으로 번호를 매길 것.
   - 세부 과정 설명은 "■ 소제목"으로 구분할 것.
   - 중요한 팁이나 주의사항은 반드시 아래의 형식으로 작성할 것:
     💡 [주의] 주의사항 제목
     > 주의사항 상세 내용

반드시 순수 JSON 객체 형태로만 출력하세요:
{
  "category": "시험시간 (예: 2시간 또는 120분)",
  "mixingMethod": "반죽법 (예: 크림법, 공립법, 별립법, 1단계변형법 등)",
  "doughTemp": "기호 없이 숫자만 (예: 20, 24)",
  "specificGravity": "기호 없이 기준 숫자만 (예: 0.55 또는 -)",
  "ovenTemp": "기호 없이 숫자만 (예: 180 / 160)",
  "bakingTime": "기호 없이 숫자만 (예: 25 또는 20~25)",
  "note": "특이사항 (예: 수작업, 호두 굽기 필수, 냉장휴지 등)",
  "mixingType": "수작업 또는 기계사용",
  "isWarmed": "0 또는 1",
  "isSacrifice": "0 또는 1",
  "summary": "공정 요약 마크다운 문자열",
  "detail": "상세 설명 마크다운 문자열"
}
`;

    // 별도 외부 라이브러리 없이 공식 REST API로 직접 통신 (일일 500회 지원 모델 적용)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API 호출 실패 (${geminiRes.status}): ${errText}`);
    }

    const geminiData = await geminiRes.json();
    let cleanText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    cleanText = cleanText.trim();

    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    const resultJson = JSON.parse(cleanText);
    return response.status(200).json(resultJson);

  } catch (error) {
    console.error('AI Generation Error:', error);
    return response.status(500).json({ error: error.message });
  }
}