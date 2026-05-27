"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  title: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ title, message, details, onRetry }: ErrorDisplayProps) {
  return (
    <div className="p-6">
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">{title}</CardTitle>
          </div>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {(details || onRetry) && (
          <CardContent className="space-y-3">
            {details && <p className="text-sm text-muted-foreground">{details}</p>}
            {onRetry && <Button variant="outline" onClick={onRetry}>Retry</Button>}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
