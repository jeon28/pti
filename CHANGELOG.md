# 변경 이력 (Changelog)

이 프로젝트의 모든 주요 변경 사항은 이 파일에 기록됩니다.

## [1.1.0] - 2026-02-06

### 추가된 기능
- **SQLite 데이터베이스 통합**: 데이터 저장소를 브라우저의 `localStorage`에서 로컬 SQLite 데이터베이스(`pti.db`)로 이전하여 안정성과 데이터 보존성을 향상했습니다.
- **Express 백엔드 서버**: RESTful API를 통해 데이터 작업을 처리하는 Node.js Express 서버(`server.mjs`)를 구현했습니다.
- **REST API 엔드포인트**:
    - `GET /api/pti`: 모든 PTI 레코드 조회
    - `POST /api/pti`: 신규 PTI 레코드 추가
    - `PUT /api/pti/:id`: 기존 레코드 수정
    - `POST /api/trash/move`: 레코드를 휴지통으로 이동
    - `POST /api/trash/restore`: 휴지통에서 레코드 복구
    - `GET/POST /api/settings/:key`: 애플리케이션 설정 관리 (예: 이메일 템플릿)
- **요구사항 정의서**: 기능 및 기술 사양을 상세히 기록한 `docs/요구사항정의서.md` 문서를 추가했습니다.
- **DB 뷰어 가이드**: PC에서 SQLite 데이터베이스를 확인하는 방법을 설명하는 섹션을 `README.md`에 추가했습니다.

### 변경 사항
- **프론트엔드 리팩토링**: 모든 React 컴포넌트(`App`, `PTIList`, `PTIForm`, `Trash`, `EmailSettings`)를 동기 방식의 `localStorage`에서 비동기 방식의 `fetch` API 호출 구조로 업데이트했습니다.
- **README.md 개편**: 로컬 서버 실행 방법 및 SQLite 사용법을 반영하여 문서를 전면 수정했습니다.
- **.gitignore 업데이트**: 로컬 데이터베이스 파일이 Git에 추적되지 않도록 `pti.db`를 추가했습니다.

### 수정 사항
- **Vite 빌드 오류 해결**: `Trash.jsx`에서 이전 저장 함수 참조로 인해 발생하던 import 오류를 수정했습니다.
- **데이터 보존 문제**: 브라우저 캐시 삭제 시 데이터가 유실되던 문제를 서버 측 저장소(SQLite) 도입으로 해결했습니다.

### 제거된 기능
- **직접적인 localStorage 접근**: 컴포넌트 내의 모든 동기식 데이터 관리 로직을 제거했습니다.
- **이전 Vercel 배포 가이드**: 현재의 로컬 SQLite 환경에 맞지 않는 서버리스 환경 위주의 배포 안내를 삭제했습니다.

---
*Antigravity AI에 의해 생성됨*
