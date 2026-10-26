// api/recipes.js
import { neon } from '@neondatabase/serverless';

// DATABASE_URL 또는 POSTGRES_URL 중 존재하는 것 자동 사용
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = neon(databaseUrl);

export default async function handler(request, response) {
  // CORS 헤더 설정 (필요시)
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

 if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // 1. [GET] 전체 품목 조회 (사용자 화면용)
  if (request.method === 'GET') {
    try {
      // --- [수정 및 삽입 부분 시작] ---
      // 1) 테이블이 없는 경우 500 에러 없이 자동 생성
      await sql`
        CREATE TABLE IF NOT EXISTS recipes (
          item_id INTEGER PRIMARY KEY,
          category TEXT,
          title TEXT NOT NULL,
          mixing_method TEXT,
          dough_temp TEXT,
          specific_gravity TEXT,
          oven_temp TEXT,
          baking_time TEXT,
          note TEXT,
          mixing_type TEXT,
          is_warmed TEXT,
          is_sacrifice TEXT,
          videos JSONB DEFAULT '[]'::jsonb,
          summary TEXT,
          detail TEXT,
          is_summary_published BOOLEAN DEFAULT false,
          is_detail_published BOOLEAN DEFAULT false
        );
      `;

      // 2) 전체 품목 조회 쿼리 실행
      const result = await sql`
        SELECT 
          item_id as id,
          category,
          title,
          mixing_method,
          dough_temp,
          specific_gravity,
          oven_temp,
          baking_time,
          note,
          mixing_type,
          is_warmed,
          is_sacrifice,
          videos,
          summary,
          detail,
          is_summary_published,
          is_detail_published
        FROM recipes
        ORDER BY item_id ASC;
      `;

      // 3) 드라이버 버전에 따른 반환 형태({ rows: [] } 또는 배열) 안전 처리
      const rows = Array.isArray(result) ? result : (result?.rows || []);
      // --- [수정 및 삽입 부분 끝] ---

      const formattedList = rows.map(row => ({
        id: row.id,
        category: row.category,
        title: row.title,
        spec: {
          mixingMethod: row.mixing_method,
          doughTemp: row.dough_temp,
          specificGravity: row.specific_gravity,
          ovenTemp: row.oven_temp,
          bakingTime: row.baking_time,
          note: row.note
        },
        mixingType: row.mixing_type,
        isWarmed: row.is_warmed,
        isSacrifice: row.is_sacrifice,
        videos: row.videos || [],
        // 비공개 상태인 경우 일반 뷰에서는 빈 문자열 처리
        summary: row.is_summary_published ? row.summary : '',
        detail: row.is_detail_published ? row.detail : '',
        // 관리자 확인용 원본 및 플래그 상태 전달
        rawSummary: row.summary,
        rawDetail: row.detail,
        isSummaryPublished: row.is_summary_published,
        isDetailPublished: row.is_detail_published
      }));

      return response.status(200).json(formattedList);
    } catch (error) {
      console.error('Database query error:', error);
      return response.status(500).json({ error: error.message });
    }
  }

  // 2. [POST] 새 품목 등록 또는 수정 (관리자용)
  if (request.method === 'POST') {
    try {
      const body = request.body;
      const {
        id,
        category,
        title,
        spec,
        mixingType,
        isWarmed,
        isSacrifice,
        videos,
        summary,
        detail,
        isSummaryPublished,
        isDetailPublished,
        adminPassword
      } = body;

      // 간단한 관리자 암호 체크 (예: cookie2026)
      if (adminPassword !== 'cookie2026') {
        return response.status(401).json({ error: '인증에 실패했습니다.' });
      }

      const categoryVal = category || ''; // 시험시간 저장 (예: "2시간", "120분")
      const mixingMethod = spec?.mixingMethod || '-';
      const doughTemp = spec?.doughTemp || '-';
      const specificGravity = spec?.specificGravity || '-';
      const ovenTemp = spec?.ovenTemp || '-';
      const bakingTime = spec?.bakingTime || '-';
      const note = spec?.note || '';
      const mixingTypeVal = mixingType || '수작업';
      const isWarmedVal = String(isWarmed ?? '0');
      const isSacrificeVal = String(isSacrifice ?? '0');
      const videosJson = JSON.stringify(videos || []);

      // 이미 있는 품목이면 UPDATE, 새 품목이면 INSERT
      // 이미 있는 품목이면 UPDATE, 새 품목이면 INSERT
      if (id) {
        await sql`
          UPDATE recipes
          SET 
            category = ${categoryVal},
            title = ${title},
            mixing_method = ${mixingMethod},
            dough_temp = ${doughTemp},
            specific_gravity = ${specificGravity},
            oven_temp = ${ovenTemp},
            baking_time = ${bakingTime},
            note = ${note},
            mixing_type = ${mixingTypeVal},
            is_warmed = ${isWarmedVal},
            is_sacrifice = ${isSacrificeVal},
            videos = ${videosJson}::jsonb,
            summary = ${summary},
            detail = ${detail},
            is_summary_published = ${isSummaryPublished},
            is_detail_published = ${isDetailPublished}
          WHERE item_id = ${id};
        `;
      } else {
        // 새 item_id 생성 (가장 큰 id + 1)
        const maxResult = await sql`SELECT COALESCE(MAX(item_id), 0) + 1 AS next_id FROM recipes;`;
        const nextId = (maxResult[0]?.next_id || (maxResult.rows && maxResult.rows[0]?.next_id)) || 1;

        await sql`
          INSERT INTO recipes (
            item_id, category, title, mixing_method, dough_temp, specific_gravity,
            oven_temp, baking_time, note, mixing_type, is_warmed, is_sacrifice,
            videos, summary, detail, is_summary_published, is_detail_published
          ) VALUES (
            ${nextId}, ${categoryVal}, ${title}, ${mixingMethod}, ${doughTemp}, ${specificGravity},
            ${ovenTemp}, ${bakingTime}, ${note}, ${mixingTypeVal}, ${isWarmedVal}, ${isSacrificeVal},
            ${videosJson}::jsonb, ${summary}, ${detail}, ${isSummaryPublished}, ${isDetailPublished}
          );
        `;
      }

      return response.status(200).json({ success: true });
    } catch (error) {
      console.error('Database save error:', error);
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).json({ error: 'Method not allowed' });
}