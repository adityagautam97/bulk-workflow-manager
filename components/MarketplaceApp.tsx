"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { useMarketplaceClient } from "@/hooks/useMarketplaceClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppFeature } from "@/components/AppFeature";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import {
  APP_STUDIO_URL,
  buildInstallGuideProfileFromManifest,
  buildSetupStepsFromManifest,
  type InstallGuideChoice,
  type InstallGuideProfile,
  type SetupStep,
} from "@/lib/install-guide-profile";

function isSetupRequiredError(error: Error): boolean {
  const errorWithCode = error as Error & { code?: string };
  const code = errorWithCode.code?.toUpperCase();
  const message = error.message.toLowerCase();

  return (
    code === "INVALID_ORIGIN" ||
    code === "TIMEOUT" ||
    code === "HANDSHAKE_FAILED" ||
    code === "CONNECTION_ERROR" ||
    message.includes("invalid message origin") ||
    message.includes("request timed out") ||
    message.includes("failed to establish connection")
  );
}

export function MarketplaceApp() {
  const deploymentUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-app-url.example";
  const profile = buildInstallGuideProfileFromManifest();
  const setupSteps = buildSetupStepsFromManifest(deploymentUrl);
  const { client, error, isLoading, isInitialized, initialize } =
    useMarketplaceClient();

  if (isLoading) return <LoadingScreen />;

  if (error) {
    if (isSetupRequiredError(error)) {
      return (
        <SetupRequiredScreen
          profile={profile}
          steps={setupSteps}
          title="App Setup Required"
          message="This app cannot be initialized outside Sitecore App Studio."
          details="Configure and install the app in Sitecore App Studio, then open it from Sitecore to use it."
        />
      );
    }

    return (
      <ConnectionErrorScreen
        title="Connection Error"
        message={error.message}
        onRetry={initialize}
      />
    );
  }

  if (!isInitialized || !client) return <LoadingScreen />;

  return <AppFeature client={client} />;
}

function CopyValueButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors in the setup UI.
    }
  }, [value]);

  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
      {copied ? "Copied!" : label}
    </Button>
  );
}

function LoadingScreen() {
  return (
    <StatusScreen
      title="Initializing App"
      description="Checking the Sitecore App Studio connection and preparing the SDK."
      icon={
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      }
      iconTone="primary"
      widthClass="max-w-md"
    >
      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          This should only take a moment.
        </p>
      </div>
    </StatusScreen>
  );
}

function SetupRequiredScreen({
  profile,
  steps,
  title,
  message,
  details,
}: {
  profile: InstallGuideProfile;
  steps: SetupStep[];
  title: string;
  message: string;
  details: string;
}) {
  return (
    <StatusScreen
      title={title}
      description={message}
      icon={<AlertCircle className="h-6 w-6 text-amber-600" />}
      iconTone="warning"
      widthClass="max-w-2xl"
      actions={
        <Button
          type="button"
          onClick={() => window.open(APP_STUDIO_URL, "_blank", "noopener,noreferrer")}
        >
          Open App Studio
          <ExternalLink className="ml-1 h-4 w-4" />
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge colorScheme="neutral">{profile.extensionLabel}</Badge>
          <Badge colorScheme="warning">Setup Required</Badge>
        </div>
        <p className="text-center text-sm text-muted-foreground">{details}</p>
        <div className="rounded-lg border bg-muted/30 p-4 text-left">
          <ol className="space-y-5">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3 py-1">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  {step.value && (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <code className="flex-1 min-w-0 block overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-xs text-foreground break-all">
                        {step.value}
                      </code>
                      {step.copyableValue && (
                        <CopyValueButton value={step.copyableValue} />
                      )}
                    </div>
                  )}
                  {step.choices && step.choices.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {step.choices.map((choice: InstallGuideChoice) => (
                        <div
                          key={choice.label}
                          className="rounded-md border bg-background px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Badge
                              colorScheme={choice.selected ? "success" : "neutral"}
                              size="sm"
                            >
                              {choice.selected ? "Select" : "Leave Off"}
                            </Badge>
                            <p className="text-xs font-medium">{choice.label}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {choice.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {step.linkHref && step.linkLabel && (
                    <a
                      href={step.linkHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {step.linkLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </StatusScreen>
  );
}

function ConnectionErrorScreen({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <StatusScreen
      title={title}
      description={message}
      icon={<AlertCircle className="h-6 w-6 text-destructive" />}
      iconTone="destructive"
      widthClass="max-w-md"
      actions={
        <Button type="button" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      <p className="text-center text-sm text-muted-foreground">
        If this problem continues, confirm the app is installed correctly and opened from Sitecore App Studio.
      </p>
    </StatusScreen>
  );
}

function StatusScreen({
  title,
  description,
  icon,
  iconTone,
  widthClass,
  children,
  actions,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  iconTone: "primary" | "warning" | "destructive";
  widthClass: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const toneClass =
    iconTone === "warning"
      ? "bg-amber-100"
      : iconTone === "destructive"
      ? "bg-destructive/10"
      : "bg-primary/10";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className={"w-full " + widthClass}>
        <CardHeader className="text-center">
          <div className={"mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full " + toneClass}>
            {icon}
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          {actions && (
            <div className="flex justify-center">
              {actions}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
