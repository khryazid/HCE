"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { ManageSubscriptionModal } from "./manage-subscription-modal";

interface SubscriptionActionsProps {
  clinicId: string;
  currentStatus: string;
  currentPlan: string;
}

export function SubscriptionActions({ clinicId, currentStatus, currentPlan }: SubscriptionActionsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="hidden group-hover:flex items-center gap-3">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 text-xs text-ink hover:text-accent font-medium bg-bg-soft hover:bg-accent/10 px-3 py-1.5 rounded-md transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Administrar
        </button>
      </div>

      {isModalOpen && (
        <ManageSubscriptionModal 
          clinicId={clinicId}
          currentStatus={currentStatus}
          currentPlan={currentPlan}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
