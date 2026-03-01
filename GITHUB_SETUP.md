# GitHub 저장소 생성 (festbookinc)

원격 저장소가 아직 없다면 아래 순서로 생성하세요.

## 1. 저장소 생성

1. [github.com/festbookinc](https://github.com/festbookinc) 접속
2. **festbookinc** 계정으로 로그인
3. **New repository** 클릭
4. 다음 정보 입력:
   - **Repository name**: `fb-ref` (또는 원하는 이름)
   - **Description**: `FB Ref. 이미지 아카이브`
   - **Visibility**: Private 또는 Public
   - **Initialize this repository with**: 체크 해제 (README, .gitignore 등 추가하지 않음)
5. **Create repository** 클릭

## 2. 저장소 이름이 `fb-ref`가 아닌 경우

다른 이름으로 생성했다면, 아래 명령어로 원격 URL을 수정하세요:

```bash
git remote set-url origin https://github.com/festbookinc/저장소이름.git
```

## 3. 푸시

저장소 생성 후:

```bash
git push -u origin main
```
