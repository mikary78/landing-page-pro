/**
 * PrivacyPage - 개인정보처리방침 페이지
 * 
 * 작성일: 2026-01-11
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import logo from "/logo.svg";

export default function PrivacyPage() {
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
            <h1>개인정보처리방침</h1>
            <p className="text-muted-foreground">최종 수정일: 2026년 1월 11일</p>

            <h2>1. 개인정보의 수집 및 이용 목적</h2>
            <p>
              Autopilot(이하 "회사")은 다음 목적을 위하여 개인정보를 처리합니다. 
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 
              이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul>
              <li>회원 가입 및 관리</li>
              <li>서비스 제공</li>
              <li>고객 문의 응대</li>
              <li>서비스 개선 및 분석</li>
            </ul>

            <h2>2. 수집하는 개인정보 항목</h2>
            <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            <ul>
              <li><strong>필수항목:</strong> 이메일, 비밀번호</li>
              <li><strong>선택항목:</strong> 이름, 회사명, 전화번호</li>
              <li><strong>자동수집:</strong> IP 주소, 서비스 이용 기록, 접속 로그</li>
            </ul>

            <h2>3. 개인정보의 보유 및 이용 기간</h2>
            <p>
              회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 
              수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
            </p>
            <ul>
              <li>회원 정보: 회원 탈퇴 시까지</li>
              <li>서비스 이용 기록: 3년</li>
            </ul>

            <h2>4. 개인정보의 제3자 제공</h2>
            <p>
              회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 
              정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조에 해당하는 
              경우에만 개인정보를 제3자에게 제공합니다.
            </p>

            <h2>5. 개인정보의 파기</h2>
            <p>
              회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 
              되었을 때에는 지체없이 해당 개인정보를 파기합니다.
            </p>

            <h2>6. 정보주체의 권리·의무</h2>
            <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
            <ul>
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리정지 요구</li>
            </ul>

            <h2>7. 개인정보 보호책임자</h2>
            <p>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 
              개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 처리하기 위하여 
              아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <ul>
              <li>개인정보 보호책임자: Autopilot 운영팀</li>
              <li>연락처: privacy@autopilot.ai</li>
            </ul>

            <h2>8. 개인정보처리방침 변경</h2>
            <p>
              이 개인정보처리방침은 2026년 1월 11일부터 적용되며, 
              법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
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
