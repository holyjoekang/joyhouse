// 손님 / 가족 두 단계 열쇠.
// 1단계: 가족 방은 문이 잠긴 채 보인다. 개발 중 미리보기는 주소에 ?key=preview 를 붙인다(보안 아님).
// 마지막 단계: private/ 콘텐츠를 AES-GCM으로 암호화한 family.bin을 현관 3D 자물쇠의 암호로 푼다.
export function isFamily() {
  return new URLSearchParams(location.search).get('key') === 'preview';
}
