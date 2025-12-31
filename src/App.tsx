import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectDetail from "./pages/ProjectDetail";
import Demo from "./pages/Demo";
import CourseView from "./pages/CourseView";
import CourseFeedbackPage from "./pages/CourseFeedbackPage";
import CoursesPage from "./pages/CoursesPage";
import CourseCreatePage from "./pages/CourseCreatePage";
import CourseBuilderPage from "./pages/CourseBuilderPage";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import AzureFunctionTest from "./pages/AzureFunctionTest";

function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/project/create" element={<ProjectCreate />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/course/:id" element={<CourseView />} />
            <Route path="/course/:id/feedback" element={<CourseFeedbackPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/create" element={<CourseCreatePage />} />
            <Route path="/courses/:id/builder" element={<CourseBuilderPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/azure-test" element={<AzureFunctionTest />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
