import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Admin from "../Admin";
import { supabase } from "@/integrations/supabase/client";

const mockUser = { id: "user-1", email: "test@example.com" };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const setupSupabaseMock = (isAdminRole: boolean) => {
  const roleData = [{ user_id: mockUser.id, role: isAdminRole ? "admin" : "user" }];

  const fromMock = vi.fn((table: string) => {
    if (table === "user_roles") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: roleData, error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: roleData, error: null })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        insert: vi.fn(() => Promise.resolve({ error: null })),
      };
    }

    if (table === "profiles") {
      return {
        select: vi.fn((_columns?: string, options?: Record<string, unknown>) => {
          if (options?.head) {
            return Promise.resolve({ count: 2, data: null, error: null });
          }
          return {
            in: vi.fn(() =>
              Promise.resolve({
                data: [{ user_id: mockUser.id, display_name: "테스트 사용자" }],
                error: null,
              }),
            ),
          };
        }),
      };
    }

    if (table === "projects" || table === "courses") {
      return {
        select: vi.fn((_columns?: string, options?: Record<string, unknown>) => {
          if (options?.head) {
            return Promise.resolve({ count: 1, data: null, error: null });
          }
          return {
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: `${table}-1`,
                      title: `${table} title`,
                      description: `${table} description`,
                      status: "draft",
                      created_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                }),
              ),
            })),
          };
        }),
      };
    }

    return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) };
  });

  (supabase as unknown as { from: typeof fromMock }).from = fromMock;
};

describe("Admin 페이지", () => {
  it("관리자 권한이 없으면 접근 불가 메시지를 보여준다", async () => {
    setupSupabaseMock(false);

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("접근 권한이 없습니다")).toBeInTheDocument();
    });
  });

  it("관리자 권한이면 콘솔 정보를 렌더링한다", async () => {
    setupSupabaseMock(true);

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>,
    );

    expect(await screen.findByText("관리자 콘솔")).toBeInTheDocument();
    expect(await screen.findByText("전체 사용자")).toBeInTheDocument();
    expect(await screen.findByText("최근 프로젝트")).toBeInTheDocument();
    expect(await screen.findByText("최근 코스")).toBeInTheDocument();
  });
});

