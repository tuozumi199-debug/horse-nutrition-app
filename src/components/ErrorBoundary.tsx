import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("HorseFeed Manager render error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="app-error">
        <h1>アプリの表示中にエラーが発生しました。</h1>
        <p>ページを再読み込みしてください。</p>
        <p>解決しない場合は、表示されたエラー内容を開発者へ共有してください。</p>
        <pre>{this.state.error.message}</pre>
        <button onClick={() => window.location.reload()}>再読み込み</button>
      </div>
    );
  }
}
