import React from "react";

export interface InteractionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pro?: boolean;
  dashed?: boolean;
}

export interface SocialItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface WideInteractionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
