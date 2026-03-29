import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import Dashboard from "./pages/Dashboard";
import PromptCompressor from "./pages/PromptCompressor";
import AIExecution from "./pages/AIExecution";
import CognitiveAnalysis from "./pages/CognitiveAnalysis";
import EvidenceBundle from "./pages/EvidenceBundle";
import BlockchainAnchor from "./pages/BlockchainAnchor";
import AuditVerify from "./pages/AuditVerify";
import AISignature from "./pages/AISignature";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import RegulatorPortal from "./pages/RegulatorPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/regulator" element={<RegulatorPortal />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/compress" element={<ProtectedRoute><PromptCompressor /></ProtectedRoute>} />
            <Route path="/execute" element={<ProtectedRoute><AIExecution /></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute><CognitiveAnalysis /></ProtectedRoute>} />
            <Route path="/bundle" element={<ProtectedRoute><EvidenceBundle /></ProtectedRoute>} />
            <Route path="/anchor" element={<ProtectedRoute><BlockchainAnchor /></ProtectedRoute>} />
            <Route path="/verify" element={<ProtectedRoute><AuditVerify /></ProtectedRoute>} />
            <Route path="/signature" element={<ProtectedRoute><AISignature /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
