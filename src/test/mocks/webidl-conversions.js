// webidl-conversions 모듈 모킹
// 테스트 환경에서 Supabase 의존성 문제를 해결하기 위한 모킹 모듈

// webidl-conversions가 필요로 하는 모든 함수를 제공
const conversions = {
  // 기본 변환 함수들
  any: (value) => value,
  boolean: (value) => Boolean(value),
  byte: (value) => Number(value),
  octet: (value) => Number(value),
  short: (value) => Number(value),
  'unsigned short': (value) => Number(value),
  long: (value) => Number(value),
  'unsigned long': (value) => Number(value),
  'long long': (value) => Number(value),
  'unsigned long long': (value) => Number(value),
  float: (value) => Number(value),
  'unrestricted float': (value) => Number(value),
  double: (value) => Number(value),
  'unrestricted double': (value) => Number(value),
  DOMString: (value) => String(value),
  ByteString: (value) => String(value),
  USVString: (value) => String(value),
  object: (value) => value,
  Date: (value) => new Date(value),
  RegExp: (value) => new RegExp(value),
  ArrayBuffer: (value) => value,
  DataView: (value) => value,
  Int8Array: (value) => value,
  Int16Array: (value) => value,
  Int32Array: (value) => value,
  Uint8Array: (value) => value,
  Uint16Array: (value) => value,
  Uint32Array: (value) => value,
  Uint8ClampedArray: (value) => value,
  Float32Array: (value) => value,
  Float64Array: (value) => value,
};

module.exports = conversions;

