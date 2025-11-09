// app/dashboard/ClientExtras.tsx
'use client';

import CommandPalette from '@/components/ui/CommandPalette';
import DeployMarkers from '@/components/ui/DeployMarkers';
import AlertCenter from '@/components/ui/AlertCenter';
import RuleManagerModal from '@/components/ui/RuleManager';
import { useRuleEngine } from '@/hooks/useRuleEngine';

function EngineMount() {
  useRuleEngine();            // mounts the live rule evaluator
  return null;
}

export default function ClientExtras() {
  return (
    <>
      <EngineMount />
      <CommandPalette />
      <DeployMarkers />
      {/* Alerts stream (anomalies) */}
      <AlertCenter />
      {/* Rules editor (create/manage rules) */}
      <RuleManagerModal />
    </>
  );
}
