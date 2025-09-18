import React from "react";
import { useNavigate } from "react-router-dom";
import FloqCreationWizard from "@/components/Creation/FloqCreationWizard";

export default function FloqCreatePage() {
  const nav = useNavigate();
  return <FloqCreationWizard onCreated={(id) => nav(`/floqs/${id}/hq`)} />;
}