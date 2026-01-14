/**
 * Footer 컴포넌트
 * 
 * 랜딩페이지 푸터
 * - 리소스 링크 (가이드, 블로그, FAQ 등)
 * - 회사 정보 (소개, 연락처 등)
 * - 영업팀 문의 모달 연결
 * 
 * 수정일: 2026-01-11
 */

import { Link } from "react-router-dom";
import { ContactModal } from "./ContactModal";
import logo from "/logo.svg";

const Footer = () => {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* 브랜드 */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={logo} 
                alt="Autopilot Logo" 
                className="w-8 h-8"
              />
              <span className="text-lg font-bold">Autopilot</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              교육 콘텐츠 자동 생성 플랫폼. 브리프부터 배포까지 36시간.
            </p>
          </div>
          
          {/* 제품 */}
          <div>
            <h3 className="font-semibold mb-4">제품</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  기능
                </Link>
              </li>
              <li>
                <Link to="/examples" className="text-muted-foreground hover:text-foreground transition-colors">
                  생성 예시
                </Link>
              </li>
              <li>
                <Link to="/demo" className="text-muted-foreground hover:text-foreground transition-colors">
                  데모
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  가격
                </Link>
              </li>
            </ul>
          </div>
          
          {/* 리소스 */}
          <div>
            <h3 className="font-semibold mb-4">리소스</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/guide" className="text-muted-foreground hover:text-foreground transition-colors">
                  가이드
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                  블로그
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <ContactModal 
                  trigger={
                    <button className="text-muted-foreground hover:text-foreground transition-colors text-left">
                      지원
                    </button>
                  }
                />
              </li>
            </ul>
          </div>
          
          {/* 회사 */}
          <div>
            <h3 className="font-semibold mb-4">회사</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  소개
                </Link>
              </li>
              <li>
                <ContactModal 
                  trigger={
                    <button className="text-muted-foreground hover:text-foreground transition-colors text-left">
                      영업팀 문의
                    </button>
                  }
                />
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  이용약관
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* 하단 */}
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; 2024 Autopilot. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-foreground transition-colors"
            >
              Twitter
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-foreground transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
