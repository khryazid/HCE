"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent } from "./card";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PanelErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in panel:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="w-full bg-red-50/50 border-red-100 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-red-900">
                Algo salió mal al cargar este panel
              </h3>
              <p className="text-xs text-red-600/80 max-w-xs">
                {this.state.error?.message || "Ocurrió un error inesperado. Por favor intenta de nuevo."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-red-700 hover:bg-red-50 border-red-200"
              onClick={this.handleReset}
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
