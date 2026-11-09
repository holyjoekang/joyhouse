// 접속자의 동네 이름표("잠실러", "판교러")를 정한다.
// 1) 이 기기에 저장된 이름표  2) IP 기준 도시(권한 요청 없음)  3) 사용자가 원하면 위치 허용 → 동 단위
// 좌표는 동 이름을 찾는 데만 쓰고 저장하지 않는다. 저장하는 것은 이름표 글자뿐이다.

const KEY = 'joyhouse.hometown';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} return v; };

// IP 조회 결과는 영어 지명이라 한국어로 옮긴다 (구 이름이 오면 구, 아니면 시)
const KO = {
  Seoul: '서울', Busan: '부산', Incheon: '인천', Daegu: '대구', Daejeon: '대전', Gwangju: '광주', Ulsan: '울산', Sejong: '세종',
  Suwon: '수원', Seongnam: '성남', Goyang: '고양', Yongin: '용인', Bucheon: '부천', Ansan: '안산', Anyang: '안양', Hwaseong: '화성',
  Namyangju: '남양주', Uijeongbu: '의정부', Paju: '파주', Gimpo: '김포', Hanam: '하남', Gwangmyeong: '광명', Siheung: '시흥',
  Pyeongtaek: '평택', Osan: '오산', Guri: '구리', Gunpo: '군포', Uiwang: '의왕', Icheon: '이천', Anseong: '안성',
  Chuncheon: '춘천', Wonju: '원주', Gangneung: '강릉', Sokcho: '속초', Cheongju: '청주', Chungju: '충주', Cheonan: '천안', Asan: '아산',
  Jeonju: '전주', Gunsan: '군산', Iksan: '익산', Mokpo: '목포', Yeosu: '여수', Suncheon: '순천', Pohang: '포항', Gyeongju: '경주',
  Gumi: '구미', Andong: '안동', Changwon: '창원', Gimhae: '김해', Jinju: '진주', Yangsan: '양산', Geoje: '거제', Jeju: '제주', Seogwipo: '서귀포',
  Gangnam: '강남', Seocho: '서초', Songpa: '송파', Gangdong: '강동', Mapo: '마포', Yongsan: '용산', Jongno: '종로', Jung: '중구',
  Seongdong: '성동', Gwangjin: '광진', Dongdaemun: '동대문', Jungnang: '중랑', Seongbuk: '성북', Gangbuk: '강북', Dobong: '도봉',
  Nowon: '노원', Eunpyeong: '은평', Seodaemun: '서대문', Yangcheon: '양천', Gangseo: '강서', Guro: '구로', Geumcheon: '금천',
  Yeongdeungpo: '영등포', Dongjak: '동작', Gwanak: '관악', Bundang: '분당', Ilsan: '일산', Haeundae: '해운대',
};
const COUNTRY = { JP: '도쿄', US: '미국', CN: '중국', VN: '베트남', TW: '대만', SG: '싱가포르', DE: '독일', GB: '런던', FR: '파리', CA: '캐나다', AU: '호주' };
// 행정동 이름보다 잘 알려진 동네 이름으로
const ALIAS = { 삼평: '판교', 백현: '판교', 운중: '판교', 판교: '판교', 신천: '잠실', 잠실: '잠실', 여의: '여의도', 성수: '성수',
  역삼: '강남', 논현: '강남', 압구정: '압구정', 청담: '청담', 서교: '홍대', 합정: '합정', 연남: '연남', 정자: '분당', 수내: '분당', 서현: '분당' };

const ko = s => { if (!s) return ''; const k = String(s).replace(/[-\s](si|gu|gun|do|city|dong)$/i, '').replace(/-/g, ''); return KO[k] || KO[s] || ''; };
// "잠실3동" → "잠실", "삼평동" → "판교", "종로1가" → "종로"
export function townOf(name) {
  if (!name) return '';
  let t = String(name).replace(/\s/g, '').replace(/제?\d+(동|가)$/, '').replace(/(동|가|읍|면|리|구|시|군)$/, '');
  if (t.length < 2) t = String(name).replace(/(동|읍|면|리)$/, '');
  return ALIAS[t] || t;
}

const timeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
const getJSON = (url, ms = 4000) => timeout(fetch(url, { cache: 'no-store' }).then(r => (r.ok ? r.json() : Promise.reject(r.status))), ms);

async function byIP() {
  const tries = [
    () => getJSON('https://ipwho.is/').then(j => j.success === false ? null : { city: j.city, region: j.region, cc: j.country_code }),
    () => getJSON('https://ipapi.co/json/').then(j => ({ city: j.city, region: j.region, cc: j.country_code })),
  ];
  for (const t of tries) {
    try {
      const r = await t();
      if (!r) continue;
      if (r.cc && r.cc !== 'KR') return COUNTRY[r.cc] || '지구';
      const name = ko(r.city) || ko(r.region);
      if (name) return name;
    } catch {}
  }
  return '';
}

// 위치 허용 → 동 이름 (OpenStreetMap Nominatim 역지오코딩, 한국어)
export async function byPosition() {
  const pos = await new Promise((ok, no) => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(ok, no, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 })
    : no(new Error('no geolocation')));
  const { latitude: lat, longitude: lon } = pos.coords;
  const j = await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=ko&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, 8000);
  const a = j.address || {};
  const town = townOf(a.quarter || a.suburb || a.neighbourhood || a.village || a.town || a.borough || a.city_district || a.city);
  if (!town) throw new Error('no town');
  return save({ town, label: `${town}러`, src: 'gps', t: Date.now() });
}

export function setTown(town) {
  const t = String(town || '').trim().replace(/러$/, '').slice(0, 8);
  return t ? save({ town: t, label: `${t}러`, src: 'manual', t: Date.now() }) : null;
}

// 저장된 이름표가 있으면 그대로, 없으면 IP 기준. 실패하면 '방문러'
export async function hometown() {
  const saved = read();
  if (saved?.label) return saved;
  const town = await byIP().catch(() => '');
  return town ? save({ town, label: `${town}러`, src: 'ip', t: Date.now() }) : { town: '', label: '방문러', src: 'none' };
}
