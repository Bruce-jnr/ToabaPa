import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

const SnackbarContext = createContext(null);

export function SnackbarProvider({ children }) {
  const [notices, setNotices] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const show = useCallback((message, { type = 'error', duration } = {}) => {
    if (!message) return;
    const notice = {
      id: ++nextId.current,
      message,
      type,
      duration: duration ?? (type === 'error' ? 8000 : 5000),
    };
    setNotices((current) => [
      ...current.filter((item) => item.message !== message || item.type !== type),
      notice,
    ].slice(-3));
  }, []);

  useEffect(() => {
    const timers = notices
      .filter((notice) => notice.duration > 0)
      .map((notice) => setTimeout(() => dismiss(notice.id), notice.duration));
    return () => timers.forEach(clearTimeout);
  }, [notices, dismiss]);

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      <div className="snackbar-stack" aria-label="Notifications">
        {notices.map((notice) => (
          <div className={`snackbar ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'} key={notice.id}>
            {notice.type === 'error' ? <CircleAlert aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}
            <span>{notice.message}</span>
            <button type="button" onClick={() => dismiss(notice.id)} aria-label="Dismiss notification">
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

export function SnackbarNotice({ message, type = 'error' }) {
  const show = useContext(SnackbarContext);
  if (!show) throw new Error('SnackbarNotice must be used inside SnackbarProvider.');
  useEffect(() => {
    if (message) show(message, { type });
  }, [message, type, show]);
  return null;
}
