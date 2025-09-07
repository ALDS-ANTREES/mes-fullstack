// 표준 에러 객체 생성
export class ApiError extends Error {
  constructor(message, { status = 0, code, data, original } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
    this.original = original;
  }
}

export const toApiError = (err) => {
  // 서버가 응답은 한 경우
  if (err?.response) {
    const { status, data } = err.response;
    const msg = data?.message || `요청 실패 (HTTP ${status})`;
    return new ApiError(msg, { status, code: data?.code, data, original: err });
  }
  // 요청은 갔지만 응답이 없는 경우
  if (err?.request) {
    return new ApiError("서버로부터 응답이 없습니다.", {
      status: 0,
      original: err,
    });
  }
  // 그 외
  return new ApiError("요청 중 알 수 없는 오류가 발생했습니다.", {
    original: err,
  });
};
