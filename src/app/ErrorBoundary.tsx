import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ChunkLoadError } from './chunks';
import { recordError } from './diagnostics';

interface Props {
  children: ReactNode;
  /** Changing this value clears a caught error (the route changed, so try the new page). */
  resetKey?: string;
  fallback: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  error: Error | null;
  resetKey: string | undefined;
}

/**
 * Keeps one broken screen from taking the whole game down. Whatever it catches is recorded on the device for the
 * grown-up's diagnostics; nothing is reported anywhere.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey === state.resetKey) return null;
    return { error: null, resetKey: props.resetKey };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (!(error instanceof ChunkLoadError)) recordError('render', error);
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    return error ? this.props.fallback(error, this.retry) : this.props.children;
  }
}
