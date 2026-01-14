/**
 * TermsPage - 이용약관 페이지
 * 
 * 작성일: 2026-01-11
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import logo from "/logo.svg";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={logo} 
                alt="Autopilot Logo" 
                className="w-8 h-8"
              />
              <span className="text-lg font-bold">Autopilot</span>
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ChevronLeft className="h-4 w-4 mr-1" />
                홈으로
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose dark:prose-invert">
            <h1>이용약관</h1>
            <p className="text-muted-foreground">최종 수정일: 2026년 1월 11일</p>

            <h2>제1조 (목적)</h2>
            <p>
              이 약관은 Autopilot(이하 "회사")이 제공하는 AI 교육 콘텐츠 생성 서비스(이하 "서비스")의 
              이용조건 및 절차, 회원과 회사의 권리, 의무, 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>

            <h2>제2조 (정의)</h2>
            <ul>
              <li><strong>"서비스"</strong>: 회사가 제공하는 AI 기반 교육 콘텐츠 생성 플랫폼</li>
              <li><strong>"회원"</strong>: 회사와 서비스 이용계약을 체결하고 이용자 ID를 부여받은 자</li>
              <li><strong>"콘텐츠"</strong>: 서비스를 통해 생성된 교육 자료 일체</li>
            </ul>

            <h2>제3조 (약관의 효력과 변경)</h2>
            <ol>
              <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위 내에서 이 약관을 변경할 수 있습니다.</li>
              <li>변경된 약관은 시행일 7일 전부터 공지합니다.</li>
            </ol>

            <h2>제4조 (회원가입)</h2>
            <ol>
              <li>이용자는 회사가 정한 절차에 따라 회원가입을 신청합니다.</li>
              <li>회사는 다음 각 호에 해당하는 신청에 대해서는 승낙을 거부할 수 있습니다.
                <ul>
                  <li>실명이 아니거나 타인의 정보를 이용한 경우</li>
                  <li>허위 정보를 기재한 경우</li>
                  <li>기타 회사가 정한 이용신청 요건을 충족하지 못한 경우</li>
                </ul>
              </li>
            </ol>

            <h2>제5조 (서비스의 내용)</h2>
            <p>회사가 제공하는 서비스는 다음과 같습니다.</p>
            <ul>
              <li>AI 기반 교육 콘텐츠 자동 생성</li>
              <li>커리큘럼 설계, 강의안, 슬라이드, 퀴즈 등 제작</li>
              <li>콘텐츠 편집 및 관리 기능</li>
              <li>콘텐츠 다운로드 및 내보내기</li>
              <li>기타 회사가 추가로 개발하거나 제휴를 통해 제공하는 서비스</li>
            </ul>

            <h2>제6조 (서비스 이용시간)</h2>
            <ol>
              <li>서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간 운영을 원칙으로 합니다.</li>
              <li>회사는 시스템 정기점검, 증설 및 교체를 위해 서비스를 일시 중단할 수 있습니다.</li>
            </ol>

            <h2>제7조 (콘텐츠의 저작권)</h2>
            <ol>
              <li>서비스를 통해 생성된 콘텐츠의 저작권은 해당 콘텐츠를 생성한 회원에게 귀속됩니다.</li>
              <li>회원은 생성된 콘텐츠를 자유롭게 수정, 배포, 상업적으로 이용할 수 있습니다.</li>
              <li>다만, AI 생성 콘텐츠의 특성상 유사한 콘텐츠가 다른 회원에게도 생성될 수 있으며, 이에 대해 회사는 책임을 지지 않습니다.</li>
            </ol>

            <h2>제8조 (회원의 의무)</h2>
            <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
            <ul>
              <li>타인의 정보를 도용하는 행위</li>
              <li>서비스에서 얻은 정보를 회사의 사전 승낙 없이 복제, 배포, 상업적으로 이용하는 행위</li>
              <li>회사의 저작권, 제3자의 저작권 등 기타 권리를 침해하는 행위</li>
              <li>공공질서 및 미풍양속에 위반되는 콘텐츠를 생성하는 행위</li>
              <li>서비스의 안정적 운영을 방해하는 행위</li>
            </ul>

            <h2>제9조 (면책조항)</h2>
            <ol>
              <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인한 서비스 제공 불능에 대해 책임을 지지 않습니다.</li>
              <li>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
              <li>AI가 생성한 콘텐츠의 정확성, 적법성에 대해서는 회원이 최종적으로 검토하고 확인해야 합니다.</li>
            </ol>

            <h2>제10조 (분쟁해결)</h2>
            <ol>
              <li>회사와 회원 간에 발생한 분쟁에 관한 소송은 회사의 본사 소재지를 관할하는 법원을 전속적 관할법원으로 합니다.</li>
              <li>회사와 회원 간에 제기된 소송에는 대한민국 법을 적용합니다.</li>
            </ol>

            <h2>부칙</h2>
            <p>이 약관은 2026년 1월 11일부터 시행됩니다.</p>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Autopilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
