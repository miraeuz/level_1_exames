import { Component, ReactNode, useEffect } from "react";
import { useExam } from "./store/exam";
import Welcome from "./screens/Welcome";
import Transition from "./screens/Transition";
import Exam from "./screens/Exam";
import Review from "./screens/Review";
import Judging from "./screens/Judging";
import Results from "./screens/Results";
import { Toast } from "./components/ui";
import { startDeliveryLoop } from "./delivery/queue";

class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="card p-6">
          <h1 className="text-lg font-bold">Kutilmagan xato</h1>
          <p className="mt-2 text-sm text-muted">Javoblaringiz saqlangan. Sahifani yangilang — imtihon shu joydan davom etadi.</p>
          <pre className="mt-3 overflow-auto rounded-lg bg-surface2 p-3 text-xs">{this.state.err.message}</pre>
          <button className="btn-primary mt-4" onClick={() => location.reload()}>
            Sahifani yangilash
          </button>
        </div>
      </div>
    );
  }
}

export default function App() {
  const attempt = useExam((s) => s.attempt);
  const phase = attempt?.phase;
  const dismiss = useExam((s) => s.dismissRestored);

  useEffect(() => {
    startDeliveryLoop();
  }, []);

  // leave-page warning while an exam is in progress
  useEffect(() => {
    const running = phase === "exam" || phase === "transition" || phase === "review" || phase === "judging";
    if (!running) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [phase]);

  let screen: ReactNode;
  if (!attempt) screen = <Welcome />;
  else if (phase === "transition") screen = <Transition key={`t-${attempt.current}`} />;
  else if (phase === "exam") screen = <Exam key={`e-${attempt.current}`} />;
  else if (phase === "review") screen = <Review />;
  else if (phase === "judging") screen = <Judging />;
  else screen = <Results />;

  return (
    <Boundary>
      {attempt?.restoredNotice && (
        <Toast onClose={dismiss} tone="success">
          <b>Imtihon tiklandi</b> — javoblaringiz saqlangan, vaqt davom etmoqda.
        </Toast>
      )}
      {screen}
    </Boundary>
  );
}
