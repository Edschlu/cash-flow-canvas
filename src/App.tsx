import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

// Public pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Protected pages
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import BusinessCases from "./pages/BusinessCases";
import Cashplan from "./pages/Cashplan";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import ScenarioComparison from "./pages/ScenarioComparison";
import Memos from "./pages/Memos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes with layout */}
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><AppLayout><Projects /></AppLayout></ProtectedRoute>} />
            <Route path="/business-cases" element={<ProtectedRoute><AppLayout><BusinessCases /></AppLayout></ProtectedRoute>} />
            <Route path="/cashplan" element={<ProtectedRoute><AppLayout><Cashplan /></AppLayout></ProtectedRoute>} />
            <Route path="/scenarios" element={<ProtectedRoute><AppLayout><ScenarioComparison /></AppLayout></ProtectedRoute>} />
            <Route path="/memos/:businessCaseId" element={<ProtectedRoute><AppLayout><Memos /></AppLayout></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
            
            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
