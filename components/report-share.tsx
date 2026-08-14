"use client";

import { useState } from "react";

import { CopyIcon, ShareIcon } from "@/components/icons";
import { Btn } from "@/components/ui";
import { buildReportText, whatsAppLink, type ReportData } from "@/lib/report-builder";

export function ReportShare({
  report,
  canEdit,
}: {
  report: ReportData;
  canEdit: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (report.rows.length === 0) {
    return (
      <Btn
        variant="secondary"
        className="w-full"
        disabled
        title="Nothing to share yet"
      >
        <ShareIcon /> Share report
      </Btn>
    );
  }

  const text = buildReportText(report);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsApp() {
    window.open(whatsAppLink(text), "_blank", "noopener");
  }

  function handleShare() {
    if (!navigator.share) return;
    navigator.share({ title: "DayMark attendance report", text }).catch(() => {});
  }

  return (
    <div className="grid gap-2">
      <Btn variant="primary" size="lg" className="w-full" onClick={handleWhatsApp}>
        <ShareIcon /> Share on WhatsApp
      </Btn>
      <div className="grid grid-cols-2 gap-2">
        {canShare ? (
          <Btn variant="secondary" onClick={handleShare}>
            <ShareIcon /> More options
          </Btn>
        ) : null}
        <Btn variant="secondary" onClick={handleCopy}>
          <CopyIcon /> {copied ? "Copied" : "Copy text"}
        </Btn>
      </div>
      <p className="px-1 text-center text-xs text-muted">
        {canEdit
          ? "Share the report with your company after marks are saved."
          : "You are viewing. Ask your supervisor to share the report."}
      </p>
    </div>
  );
}