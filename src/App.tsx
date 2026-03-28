import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compress" element={<PromptCompressor />} />
          <Route path="/execute" element={<AIExecution />} />
          <Route path="/analyze" element={<CognitiveAnalysis />} />
          <Route path="/bundle" element={<EvidenceBundle />} />
          <Route path="/anchor" element={<BlockchainAnchor />} />
          <Route path="/verify" element={<AuditVerify />} />
          <Route path="/signature" element={<AISignature />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
