/**
 * Application Insights 설정
 * 
 * Azure Application Insights를 사용한 프론트엔드 모니터링
 * - 페이지 뷰 추적
 * - 사용자 행동 추적
 * - 에러 추적
 * - 성능 메트릭
 * 
 * 환경 변수:
 * - VITE_APPINSIGHTS_CONNECTION_STRING: Application Insights 연결 문자열
 * 
 * @see https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript
 */

import { ApplicationInsights, ITelemetryItem } from '@microsoft/applicationinsights-web';

// Application Insights 인스턴스
let appInsights: ApplicationInsights | null = null;

/**
 * Application Insights 초기화
 */
export function initApplicationInsights(): ApplicationInsights | null {
  const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING;
  
  // 연결 문자열이 없으면 초기화하지 않음
  if (!connectionString) {
    console.log('[AppInsights] Connection string not configured, skipping initialization');
    return null;
  }

  // 이미 초기화되어 있으면 기존 인스턴스 반환
  if (appInsights) {
    return appInsights;
  }

  try {
    appInsights = new ApplicationInsights({
      config: {
        connectionString,
        // 자동 추적 설정
        enableAutoRouteTracking: true,           // 라우트 변경 자동 추적
        enableCorsCorrelation: true,             // CORS 요청 상관관계
        enableRequestHeaderTracking: true,       // 요청 헤더 추적
        enableResponseHeaderTracking: true,      // 응답 헤더 추적
        enableAjaxErrorStatusText: true,         // AJAX 에러 상태 텍스트
        disableAjaxTracking: false,              // AJAX 추적 활성화
        autoTrackPageVisitTime: true,            // 페이지 체류 시간 추적
        
        // 성능 설정
        maxBatchInterval: 15000,                 // 배치 전송 간격 (15초)
        maxBatchSizeInBytes: 102400,             // 최대 배치 크기 (100KB)
        
        // 개발 환경 설정
        loggingLevelConsole: import.meta.env.DEV ? 2 : 0,  // 개발 시 콘솔 로깅
        loggingLevelTelemetry: 1,
        
        // 샘플링 (프로덕션에서 비용 절감)
        samplingPercentage: import.meta.env.PROD ? 50 : 100,
      }
    });

    // 텔레메트리 초기화 콜백 설정
    appInsights.addTelemetryInitializer((item: ITelemetryItem) => {
      // 사용자 정보 추가 (있는 경우)
      const userId = localStorage.getItem('user_id');
      if (userId && item.tags) {
        item.tags['ai.user.id'] = userId;
      }

      // 환경 정보 추가
      if (item.data) {
        item.data['environment'] = import.meta.env.VITE_APP_ENV || 'development';
        item.data['version'] = import.meta.env.VITE_APP_VERSION || '0.0.0';
      }

      return true;
    });

    // SDK 로드
    appInsights.loadAppInsights();

    // 초기 페이지 뷰 추적
    appInsights.trackPageView();

    console.log('[AppInsights] Initialized successfully');
    return appInsights;
  } catch (error) {
    console.error('[AppInsights] Initialization failed:', error);
    return null;
  }
}

/**
 * Application Insights 인스턴스 가져오기
 */
export function getAppInsights(): ApplicationInsights | null {
  return appInsights;
}

/**
 * 커스텀 이벤트 추적
 */
export function trackEvent(name: string, properties?: Record<string, string>, measurements?: Record<string, number>): void {
  if (!appInsights) return;
  
  appInsights.trackEvent({
    name,
    properties,
    measurements
  });
}

/**
 * 예외 추적
 */
export function trackException(error: Error, properties?: Record<string, string>): void {
  if (!appInsights) return;
  
  appInsights.trackException({
    exception: error,
    properties
  });
}

/**
 * 성능 메트릭 추적
 */
export function trackMetric(name: string, average: number, properties?: Record<string, string>): void {
  if (!appInsights) return;
  
  appInsights.trackMetric({
    name,
    average,
    properties
  });
}

/**
 * 페이지 뷰 추적
 */
export function trackPageView(name?: string, uri?: string): void {
  if (!appInsights) return;
  
  appInsights.trackPageView({
    name,
    uri
  });
}

/**
 * 사용자 ID 설정
 */
export function setUserId(userId: string): void {
  if (!appInsights) return;
  
  appInsights.setAuthenticatedUserContext(userId);
  localStorage.setItem('user_id', userId);
}

/**
 * 사용자 ID 초기화 (로그아웃 시)
 */
export function clearUserId(): void {
  if (!appInsights) return;
  
  appInsights.clearAuthenticatedUserContext();
  localStorage.removeItem('user_id');
}

/**
 * 의존성 추적 (외부 API 호출)
 */
export function trackDependency(
  name: string,
  target: string,
  duration: number,
  success: boolean,
  responseCode?: number
): void {
  if (!appInsights) return;
  
  appInsights.trackDependencyData({
    id: crypto.randomUUID(),
    name,
    target,
    duration,
    success,
    responseCode,
    type: 'HTTP'
  });
}

export default appInsights;
