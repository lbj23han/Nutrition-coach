# 나만의 영양코치 🥗

AI 기반 개인 맞춤형 식단 관리 앱. 카메라로 음식을 찍으면 AI가 영양 정보를 자동 분석하고, 목표에 맞는 식단 코칭을 제공합니다.

## 주요 기능

- **AI 음식 인식** — 카메라로 촬영하거나 텍스트로 입력하면 GPT-4o가 칼로리/탄단지 자동 분석
- **맞춤 목표 설정** — 체중/체지방률 기반 BMR·TDEE 계산, 6가지 목표(벌크업/린벌크/커팅 등) 지원
- **식사 기록** — 아침·점심·저녁·간식별 기록 및 일별 영양소 추적
- **주간 통계** — 7일 칼로리 차트 및 AI 체중 변화 예측 그래프
- **AI 코치** — GPT-4o-mini 기반 개인화 식단 상담 채팅
- **데모 모드** — API 키 없이도 앱 체험 가능

## 기술 스택

- **Frontend** — Expo (React Native), TypeScript, Expo Router
- **Backend** — Supabase (Auth + PostgreSQL)
- **AI** — OpenAI GPT-4o (이미지 분석), GPT-4o-mini (텍스트 분석·코칭)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사해서 `.env` 생성 후 값 입력:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

### 3. Supabase DB 설정

Supabase 대시보드 → SQL Editor → `supabase-schema.sql` 내용 실행

### 4. 앱 실행

```bash
npx expo start
```

> 카메라 기능은 실제 기기 또는 Development Build 필요 (`npx expo run:ios`)

## 프로젝트 구조

```
app/
  (auth)/        # 로그인·회원가입
  (tabs)/        # 메인 탭 (오늘·기록·통계·AI코치·프로필)
  onboarding.tsx # 초기 프로필 설정
features/
  auth/          # AuthContext (데모 모드 포함)
services/
  openai.ts      # AI 분석·코칭
  nutrition.ts   # 식단 기록 CRUD
  auth.ts        # Supabase 인증
lib/
  calculations.ts # BMR·TDEE·목표 칼로리 계산
  constants.ts
components/
  nutrition/     # FoodCamera, FoodConfirmSheet
```
