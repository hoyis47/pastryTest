// api/generate-ai.js
import { GoogleGenAI } from '@google/genai';

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

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
당신은 제과기능사 실기 시험 학습 데이터 정리 전문가입니다.
품목명: "${title || '제과 실기 품목'}"
참고 영상 링크: "${videoUrl}"

영상 내용과 제과기능사 표준 공정을 분석하여 아래 JSON 규격에 맞춰 데이터를 생성해 주세요.
만약 영상에서 특정 스펙 수치를 알 수 없다면 빈칸("") 또는 "-"로 남겨두세요.

[규격 안내]
1. summary (상단 캡슐 게임용 공정 요약):
   - 반드시 "### [1단계] 단계제목 (키워드1, 키워드2)" 형식으로 작성할 것.
   - 괄호 안 키워드는 캡슐에 들어갈 단어로 1~3단어, 쉼표로 구분할 것.
   - 단계 본문은 불릿 포인트(-) 2~3줄로 행동 요령만 초압축할 것.
2. detail (하단 상세 학습노트용):
   - "[1] 단계명", "[2] 단계명" 형식으로 번호 매김.
   - 주요 포인트는 "■ 소제목"으로 표시.
   - 핵심 주의사항은 반드시 아래 형식의 인용 블록으로 작성:
     💡 [주의] 주의사항 제목
     > 주의사항 상세 설명

반드시 아래 JSON 스키마 형식으로만 응답하세요:
{
  "mixingMethod": "크림법/공립법/별립법 등",
  ""category": "시험시간 (예: 2시간, 110분 등)",
  "doughTemp": "기호 없이 숫자만 (예: 20)",
  "specificGravity": "기호 없이 기준 숫자만 (예: 0.55 또는 -)",
  "ovenTemp": "기호 없이 숫자만 (예: 180 / 160)",
  "bakingTime": "기호 없이 숫자만 (예: 20~25)",
  "note": "수작업, 냉장휴지 30분 등",
  "mixingType": "수작업 또는 기계사용",
  "isWarmed": "0 또는 1",
  "isSacrifice": "0 또는 1",
  "summary": "마크다운 문자열",
  "detail": "마크다운 문자열"
}
`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultJson = JSON.parse(aiResponse.text.trim());
    return response.status(200).json(resultJson);

  } catch (error) {
    console.error('AI Generation Error:', error);
    return response.status(500).json({ error: error.message });
  }
}