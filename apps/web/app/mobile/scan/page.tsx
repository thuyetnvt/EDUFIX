"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";

type BarcodeDetectorLike = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorLike;
  }
}

export default function Scan() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopCamera() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  useEffect(() => stopCamera, []);

  async function startCamera() {
    setError("");
    if (!window.BarcodeDetector) {
      setError(
        "Trình duyệt chưa hỗ trợ nhận diện QR tự động. Hãy nhập token hoặc dán đường dẫn.",
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Thiết bị chưa cho phép truy cập camera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const codes = await detector.detect(videoRef.current);
        const rawValue = codes[0]?.rawValue;
        if (rawValue) {
          stopCamera();
          const token = rawValue.includes("/scan/")
            ? rawValue.split("/scan/").pop()
            : rawValue;
          if (token) router.push(`/scan/${encodeURIComponent(token)}`);
          return;
        }
        timerRef.current = setTimeout(() => void scan(), 400);
      };
      void scan();
    } catch {
      stopCamera();
      setError("Không thể mở camera. Hãy kiểm tra quyền camera của trình duyệt.");
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const token = value.includes("/scan/")
      ? value.split("/scan/").pop()
      : value;
    if (token) router.push(`/scan/${encodeURIComponent(token)}`);
  }
  return (
    <AppShell title="Quét QR thiết bị">
      <section className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="quick-card">
          <b>⌗</b>
          <span>Hướng camera vào mã QR trên thiết bị</span>
        </div>
        <p className="muted">
          Có thể quét bằng camera hoặc nhập token/dán đường dẫn từ mã QR.
        </p>
        {cameraOpen && (
          <div className="section">
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: "100%", borderRadius: 12 }}
            />
            <button className="button secondary" type="button" onClick={stopCamera}>
              Đóng camera
            </button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {!cameraOpen && (
          <button className="button secondary section" type="button" onClick={() => void startCamera()}>
            Mở camera quét QR
          </button>
        )}
        <form onSubmit={submit}>
          <label>
            Mã QR
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Dán token QR tại đây"
              required
            />
          </label>
          <button className="button section">Tra cứu thiết bị</button>
        </form>
      </section>
    </AppShell>
  );
}
