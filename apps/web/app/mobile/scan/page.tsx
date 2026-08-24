"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import { Camera, CameraOff, QrCode, ScanLine } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { ErrorBox } from "../../../components/UI";

type BarcodeDetectorLike = new (options?: { formats?: string[] }) => { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };
declare global { interface Window { BarcodeDetector?: BarcodeDetectorLike } }

export default function Scan() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zxingRef = useRef<{ stop: () => void } | null>(null);

  function go(rawValue: string) {
    const token = rawValue.includes("/scan/") ? rawValue.split("/scan/").pop() : rawValue;
    if (token) { stopCamera(); router.push(`/scan/${encodeURIComponent(token)}`); }
  }
  function stopCamera() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    zxingRef.current?.stop(); zxingRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }
  useEffect(() => stopCamera, []);

  async function startCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) { setError("Thiết bị chưa cho phép truy cập camera."); return; }
    setCameraOpen(true);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (!videoRef.current) return;
    try {
      if (!window.BarcodeDetector) {
        const reader = new BrowserQRCodeReader();
        zxingRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => { if (result) go(result.getText()); });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      streamRef.current = stream; videoRef.current.srcObject = stream; await videoRef.current.play();
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        const codes = await detector.detect(videoRef.current); const rawValue = codes[0]?.rawValue;
        if (rawValue) { go(rawValue); return; }
        timerRef.current = setTimeout(() => void scan(), 400);
      };
      void scan();
    } catch {
      stopCamera(); setError("Không thể mở camera. Hãy cấp quyền camera hoặc nhập token thủ công.");
    }
  }
  function submit(event: FormEvent) { event.preventDefault(); go(value); }

  return <AppShell title="Quét QR thiết bị"><section className="card scan-card"><div className="scan-intro"><span className="scan-icon"><QrCode size={34} /></span><div><h2>Quét mã trên thiết bị</h2><p className="muted">Đưa mã QR vào khung quét. Nếu trình duyệt không hỗ trợ, EduFix sẽ dùng bộ quét tương thích rộng hơn.</p></div></div>{cameraOpen && <div className="scanner-viewport"><video ref={videoRef} muted playsInline /><div className="scanner-frame"><ScanLine size={28} /></div><p>Đang tìm mã QR…</p><button className="button secondary" type="button" onClick={stopCamera}><CameraOff size={16} /> Đóng camera</button></div>}<ErrorBox message={error} />{!cameraOpen && <button className="button section" type="button" onClick={() => void startCamera()}><Camera size={17} /> Mở camera quét QR</button>}<div className="scan-divider"><span>hoặc nhập thủ công</span></div><form onSubmit={submit}><label>Mã QR / đường dẫn<input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Dán token QR tại đây" required /></label><button className="button section"><QrCode size={17} /> Tra cứu thiết bị</button></form></section></AppShell>;
}
