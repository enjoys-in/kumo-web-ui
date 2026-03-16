import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Dashboard } from "@/pages/dashboard";
import { BouncePage } from "@/pages/bounce";
import { SuspendPage } from "@/pages/suspend";
import { SuspendReadyQPage } from "@/pages/suspend-ready-q";
import { InjectPage } from "@/pages/inject";
import { QueueInspectPage } from "@/pages/queue-inspect";
import { MessageInspectPage } from "@/pages/message-inspect";
import { MetricsPage } from "@/pages/metrics";
import { LogFilterPage } from "@/pages/log-filter";
import { RebindPage } from "@/pages/rebind";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bounce" element={<BouncePage />} />
        <Route path="/suspend" element={<SuspendPage />} />
        <Route path="/suspend-ready-q" element={<SuspendReadyQPage />} />
        <Route path="/inject" element={<InjectPage />} />
        <Route path="/queues" element={<QueueInspectPage />} />
        <Route path="/messages" element={<MessageInspectPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/log-filter" element={<LogFilterPage />} />
        <Route path="/rebind" element={<RebindPage />} />
      </Route>
    </Routes>
  );
}

export default App;
